import { signIn, signOut } from "@/lib/auth";

type AuthButtonsProps = {
  signedIn: boolean;
  name?: string | null;
};

export function AuthButtons({ signedIn, name }: AuthButtonsProps) {
  if (signedIn) {
    return (
      <div className="auth-bar">
        <span className="auth-name">{name || "Signed in"}</span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button type="submit" className="btn-ghost">
            Sign out
          </button>
        </form>
      </div>
    );
  }

  return (
    <form
      action={async () => {
        "use server";
        await signIn("github", { redirectTo: "/dashboard" });
      }}
    >
      <button type="submit" className="btn-ghost">
        Sign in with GitHub
      </button>
    </form>
  );
}
