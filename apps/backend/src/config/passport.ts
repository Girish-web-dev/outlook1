import passport from "passport";
import { Strategy as GoogleStrategy, type Profile } from "passport-google-oauth20";
import type { VerifyCallback } from "passport-oauth2";
import { env } from "./env";
import { authService } from "../services/authService";

export function configurePassport(): void {
  if (!env.GOOGLE_CONFIGURED || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: VerifyCallback
      ) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            done(new Error("Google account does not expose an email address"));
            return;
          }

          const user = await authService.upsertGoogleUser({
            googleId: profile.id,
            name: profile.displayName || email,
            email,
            avatar: profile.photos?.[0]?.value
          });

          done(null, user);
        } catch (error) {
          done(error);
        }
      }
    )
  );
}
