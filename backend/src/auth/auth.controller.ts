import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import { AppConfig } from '../config/configuration';
import { Public } from '../common/decorators/public.decorator';
import { AuthService, GoogleProfileInput } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleTokenDto } from './dto/google-token.dto';
import { PublicUser } from './auth.types';
import { GoogleAuthGuard } from './guards/google-auth.guard';

const REFRESH_COOKIE_NAME = 'refresh_token';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: PublicUser; accessToken: string }> {
    const { user, tokens } = await this.authService.register(dto);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { user, accessToken: tokens.accessToken };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: PublicUser; accessToken: string }> {
    const { user, tokens } = await this.authService.login(dto);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { user, accessToken: tokens.accessToken };
  }

  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin(): void {
    // El guard redirige a Google; este metodo no se ejecuta.
  }

  /** Login con Google desde la app nativa (Capacitor) — ver AuthService.loginWithGoogleIdToken. */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('google/token')
  async googleToken(
    @Body() dto: GoogleTokenDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: PublicUser; accessToken: string }> {
    const { user, tokens } = await this.authService.loginWithGoogleIdToken(dto.idToken);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { user, accessToken: tokens.accessToken };
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const profile = req.user as GoogleProfileInput;
    const { tokens } = await this.authService.validateOrCreateGoogleUser(profile);
    this.setRefreshCookie(res, tokens.refreshToken);

    const frontendUrl = this.configService.get('corsOrigin', { infer: true });
    res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${encodeURIComponent(tokens.accessToken)}`,
    );
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    if (!refreshToken) {
      throw new UnauthorizedException('Falta el refresh token');
    }

    const tokens = await this.authService.refresh(refreshToken);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: true }> {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
    return { success: true };
  }

  private setRefreshCookie(res: Response, refreshToken: string): void {
    const options: CookieOptions = {
      httpOnly: true,
      secure: this.configService.get('nodeEnv', { infer: true }) === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    };
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, options);
  }
}
