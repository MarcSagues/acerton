import type { LocaleEmailCopy } from './types';

export const copy: LocaleEmailCopy = {
  verification: {
    subject: 'Confirm your email on Piqo',
    preheader:
      'One more step and you can create your group and start your football pool with your friends.',
    mascotAlt: 'Piqo mascot celebrating',
    heading: 'Confirm your email address',
    body: 'Thanks for creating your Piqo account. Confirm your email to activate it, so you can create your group, choose a competition and share the link with your friends.',
    button: 'Confirm my email',
    expiry: 'This link expires in 24 hours.',
    buttonFallback: 'Button not working? Copy and paste this link into your browser:',
    ignore: "If you didn't create a Piqo account, you can ignore this email.",
  },
  reset: {
    subject: 'Reset your Piqo password',
    preheader: 'This link to reset your password expires in 60 minutes.',
    mascotAlt: 'Piqo mascot thinking',
    heading: 'Forgot your password?',
    body: 'We received a request to reset the password of your Piqo account. Tap the button below to create a new password.',
    button: 'Reset password',
    expiry: 'This link expires in 60 minutes for security.',
    buttonFallback: 'Button not working? Copy and paste this link into your browser:',
    ignore:
      "If you didn't request this change, you can ignore this email: your password will stay the same.",
  },
  footer: {
    tagline:
      'The app for running a football pool with your group.<br/>No money, no bets and no spreadsheets.',
    notOperator: 'Piqo is not a gambling operator. Bets and cash prizes are not accepted.',
  },
};
