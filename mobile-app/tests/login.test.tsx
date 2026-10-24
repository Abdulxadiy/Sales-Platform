import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { LoginScreen } from '../src/features/auth/LoginScreen';
import { ThemeProvider } from '../src/theme/ThemeContext';
import * as Linking from 'expo-linking';
const mockCheck = jest.fn(async () => {}), mockSend = jest.fn(async () => {}), mockVerify = jest.fn(async () => {}), mockReset = jest.fn();
let mockStep = 'telegram', mockDeadline = 0;
jest.mock('../src/features/auth/AuthContext', () => ({ useAuth: () => ({ login: jest.fn(), sendOtp: mockSend, verifyOtp: mockVerify, loginStep: mockStep, loginTicket: 'ticket', phoneHint: '+99890***1234', checkTelegram: mockCheck, resetLogin: mockReset, otpResendAt: mockDeadline }) }));
jest.mock('expo-linking', () => ({ openURL: jest.fn(async () => {}) }));
describe('Telegram login interface', () => {
  beforeEach(() => { jest.clearAllMocks(); mockStep = 'telegram'; mockDeadline = 0; });
  test('bot onboarding offers the actual bot link and a connection check', async () => {
    const screen = await render(<ThemeProvider><LoginScreen /></ThemeProvider>);
    await fireEvent.press(screen.getByText('Telegram botni ochish'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://t.me/ilbi_bot');
    await fireEvent.press(screen.getByText('Ulanishni tekshirish'));
    expect(mockCheck).toHaveBeenCalled();
    expect(screen.queryByPlaceholderText('123456')).toBeNull();
  });
  test('cooldown disables resend and offers return to credentials', async () => {
    mockStep = 'otp'; mockDeadline = Date.now() + 179000;
    const screen = await render(<ThemeProvider><LoginScreen /></ThemeProvider>);
    await fireEvent.press(screen.getByText(/Qayta yuborish:/));
    expect(mockSend).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText('Login va parolga qaytish'));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });
  test('incomplete code is not submitted', async () => {
    mockStep = 'otp';
    const screen = await render(<ThemeProvider><LoginScreen /></ThemeProvider>);
    await fireEvent.changeText(screen.getByPlaceholderText('123456'), '1234');
    await fireEvent.press(screen.getByText('Tasdiqlash'));
    expect(mockVerify).not.toHaveBeenCalled();
    expect(screen.getByText('Tasdiqlash kodini to‘liq kiriting')).toBeTruthy();
  });
});
