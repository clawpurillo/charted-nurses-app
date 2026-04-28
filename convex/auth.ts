import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        return {
          name: (params.name as string) || (params.email as string).split("@")[0],
          email: params.email as string,
        };
      },
    }),
  ],
});
