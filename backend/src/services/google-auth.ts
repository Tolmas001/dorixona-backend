import { OAuth2Client } from 'google-auth-library';

export type GoogleUserProfile = {
  googleId: string;
  email: string;
  fullName: string;
};

export const verifyGoogleIdToken = async (
  idToken: string,
  googleClientId: string,
): Promise<GoogleUserProfile> => {
  const client = new OAuth2Client(googleClientId);

  const ticket = await client.verifyIdToken({
    idToken,
    audience: googleClientId,
  });

  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email || !payload.name) {
    throw new Error('Invalid Google account payload.');
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    fullName: payload.name,
  };
};
