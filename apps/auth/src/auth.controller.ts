import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Public } from '@shared/authz/decorators';
import { ok, created } from '@shared/response';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto);
    // Auth service returns partial envelope, wrap it properly
    return created(
      result.data,
      result.message || 'Registration successful. Please check your email for verification code.',
    );
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    return ok(result, 'Successfully logged in');
  }

  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Verify email with verification code' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired verification code',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    const result = await this.authService.verifyEmail(verifyEmailDto);
    return ok(result.data, result.message || 'Email verified successfully');
  }

  @Post('resend-verification')
  @Public()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Resend verification code to email' })
  @ApiResponse({
    status: 200,
    description: 'Verification code sent successfully',
  })
  @ApiResponse({ status: 429, description: 'Too many verification attempts' })
  async resendVerification(
    @Body() resendVerificationDto: ResendVerificationDto,
  ) {
    const result = await this.authService.resendVerification(resendVerificationDto);
    return ok(result.data, result.message || 'Verification code sent successfully');
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Request password reset link' })
  @ApiResponse({
    status: 200,
    description: 'If email exists, password reset link sent',
  })
  @ApiResponse({ status: 429, description: 'Too many reset requests' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(forgotPasswordDto);
    return ok(result, result.message || 'If email exists, password reset link sent');
  }

  @Get('validate-reset-token')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate password reset token' })
  @ApiQuery({
    name: 'token',
    required: true,
    description: 'Password reset token',
  })
  @ApiResponse({
    status: 200,
    description: 'Token validation result',
  })
  async validateResetToken(@Query('token') token: string) {
    const result = await this.authService.validateResetToken(token);
    return ok(result, 'Token validation completed');
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const result = await this.authService.resetPassword(resetPasswordDto);
    return ok(result, result.message || 'Password reset successfully');
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ 
    summary: 'Refresh access token using refresh token',
    description: 'Issues a new access token and rotates the refresh token. Old refresh token becomes invalid after use. Detects token reuse and revokes all tokens if an already-rotated token is used.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Token refreshed successfully' },
        error: { type: 'null' },
        data: {
          type: 'object',
          properties: {
            accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            refreshToken: { type: 'string', example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2' },
            user: {
              type: 'object',
              properties: {
                email: { type: 'string', example: 'user@example.com' },
                fullName: { type: 'string', example: 'John Doe' },
                avatarUrl: { type: 'string', nullable: true, example: null }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Invalid, expired, revoked, or reused refresh token',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Invalid refresh token. Please log in again.' },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'AUTH_0015' },
            message: { type: 'string', example: 'Invalid refresh token. Please log in again.' },
            timestamp: { type: 'string', example: '2026-01-10T07:45:21.745Z' }
          }
        },
        data: { type: 'null' }
      }
    }
  })
  @ApiResponse({ 
    status: 429, 
    description: 'Too many refresh requests' 
  })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    const result = await this.authService.refreshToken(refreshTokenDto);
    return ok(result, 'Token refreshed successfully');
  }

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  health() {
    return ok({ status: 'ok', service: 'auth' }, 'Auth service is healthy');
  }
}
