import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";

import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { Public } from "../../../common/decorators/public.decorator";
import type { RequestPrincipal, RequestWithContext } from "../../../common/context/request-context";
import { AuthService } from "../application/auth.service";
import { ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto, SignInDto } from "./auth.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post("login")
  async signIn(
    @Body() dto: SignInDto,
    @Req() request: RequestWithContext,
    @Res() response: Response,
  ) {
    const tokens = await this.authService.signIn({
      email: dto.email,
      password: dto.password,
      companyId: dto.companyId,
      rememberMe: dto.rememberMe ?? false,
      device: request.device,
    });

    this.setAuthCookies(response, tokens.accessToken, tokens.refreshToken, dto.rememberMe ?? false);
    return response.status(200).json({ authenticated: true });
  }

  @Public()
  @Post("refresh")
  async refresh(@Req() request: RequestWithContext, @Res() response: Response) {
    const refreshToken = request.cookies?.fleetcontrol_refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedException("Missing refresh token");
    }
    const tokens = await this.authService.refresh({ refreshToken, device: request.device });
    this.setAuthCookies(
      response,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.rememberMe ?? false,
    );
    return response.status(200).json({ refreshed: true });
  }

  @ApiBearerAuth()
  @Post("logout")
  async logout(
    @CurrentUser() user: RequestPrincipal,
    @Req() request: RequestWithContext,
    @Res() response: Response,
  ) {
    await this.authService.logout(user, request.device);
    this.clearAuthCookies(response);
    return response.status(200).json({ loggedOut: true });
  }

  @Public()
  @Post("forgot-password")
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email, dto.companyId);
    return { accepted: true };
  }

  @Public()
  @Post("reset-password")
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() request: RequestWithContext) {
    await this.authService.resetPassword(dto.token, dto.password, request.device);
    return { changed: true };
  }

  @ApiBearerAuth()
  @Patch("password")
  async changePassword(
    @CurrentUser() user: RequestPrincipal,
    @Body() dto: ChangePasswordDto,
    @Req() request: RequestWithContext,
  ) {
    await this.authService.changePassword(
      user,
      dto.currentPassword,
      dto.nextPassword,
      request.device,
    );
    return { changed: true };
  }

  @ApiBearerAuth()
  @Get("me")
  me(@CurrentUser() user: RequestPrincipal) {
    return this.authService.getProfile(user);
  }

  @ApiBearerAuth()
  @Get("sessions")
  listSessions(@CurrentUser() user: RequestPrincipal) {
    return this.authService.listSessions(user);
  }

  @ApiBearerAuth()
  @Post("sessions/:sessionId/revoke")
  revokeSession(
    @CurrentUser() user: RequestPrincipal,
    @Param("sessionId") sessionId: string,
    @Req() request: RequestWithContext,
  ) {
    return this.authService.revokeSession(sessionId, user, request.device);
  }

  private setAuthCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
    rememberMe: boolean,
  ) {
    const secure = this.configService.get<boolean>("COOKIE_SECURE", false);
    const domain = this.configService.get<string>("COOKIE_DOMAIN") || undefined;

    response.cookie("fleetcontrol_access_token", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      domain,
      maxAge: 1000 * 60 * 15,
      path: "/",
    });
    response.cookie("fleetcontrol_refresh_token", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      domain,
      maxAge: rememberMe ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * 60 * 24 * 7,
      path: "/",
    });
  }

  private clearAuthCookies(response: Response) {
    const domain = this.configService.get<string>("COOKIE_DOMAIN") || undefined;
    response.clearCookie("fleetcontrol_access_token", { path: "/", domain });
    response.clearCookie("fleetcontrol_refresh_token", { path: "/", domain });
  }
}
