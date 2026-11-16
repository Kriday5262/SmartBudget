import { useState } from "react";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, KeyRound } from "lucide-react";
import { FilledButton, TextField } from "@/components/MaterialList";
import { addHomeMemberAccount } from "@/lib/store";

function suggestUsername(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 24);
}

/** A readable random password, e.g. "maple-river-4821". */
function generatePassword(): string {
  const words = [
    "maple",
    "river",
    "cloud",
    "tiger",
    "mango",
    "pearl",
    "cedar",
    "lotus",
    "amber",
    "spark",
    "olive",
    "comet",
  ];
  const pick = () => words[crypto.getRandomValues(new Uint32Array(1))[0] % words.length];
  const n = 1000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9000);
  return `${pick()}-${pick()}-${n}`;
}

/**
 * Add someone to the current household with their own login. After saving it
 * shows the username and password once, so they can be passed on.
 */
export function AddMemberForm({
  onDone,
  onCancel,
}: {
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{
    name: string;
    username: string;
    password: string;
  } | null>(null);

  if (created) {
    const text = `SmartBudget login for ${created.name}\nWebsite: ${window.location.origin}\nUsername: ${created.username}\nPassword: ${created.password}`;
    return (
      <div className="animate-native-slide space-y-4 bg-card px-5 py-5">
        <div>
          <p className="font-semibold">{created.name} can sign in now</p>
          <p className="text-sm text-muted-foreground">
            Send them these details. They&apos;ll land in this household and can change the password
            in Settings › Security.
          </p>
        </div>
        <dl className="sb-wiz-pop grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-2xl bg-muted/50 px-4 py-3 text-sm">
          <dt className="text-muted-foreground">Username</dt>
          <dd className="font-mono font-semibold">{created.username}</dd>
          <dt className="text-muted-foreground">Password</dt>
          <dd className="font-mono font-semibold">{created.password}</dd>
        </dl>
        <div className="flex justify-end gap-2">
          <FilledButton
            type="button"
            variant="tonal"
            onClick={() => {
              navigator.clipboard?.writeText(text);
              toast.success("Login details copied");
            }}
          >
            <Copy className="h-4 w-4" /> Copy details
          </FilledButton>
          <FilledButton type="button" onClick={() => onDone?.()}>
            Done
          </FilledButton>
        </div>
      </div>
    );
  }

  async function submit() {
    setError("");
    if (!name.trim()) return setError("Enter their name");
    if (!username.trim()) return setError("Choose a username");
    if (password.length < 8) return setError("The password needs at least 8 characters");
    setBusy(true);
    const res = await addHomeMemberAccount({
      name: name.trim(),
      username: username.trim(),
      password,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Couldn't create the account");
    toast.success(`${name.trim()} added`);
    setCreated({ name: name.trim(), username: username.trim().toLowerCase(), password });
  }

  return (
    <form
      className="animate-native-slide space-y-4 bg-card px-5 py-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <TextField
        label="Name"
        placeholder="e.g. Priya"
        autoFocus
        value={name}
        maxLength={40}
        data-wiz-enter="self"
        onChange={(e) => {
          setName(e.target.value);
          if (!usernameTouched) setUsername(suggestUsername(e.target.value));
        }}
      />
      <TextField
        label="Username"
        placeholder="e.g. priya"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        value={username}
        maxLength={32}
        data-wiz-enter="self"
        hint="Letters, numbers, dots, dashes or underscores"
        onChange={(e) => {
          setUsernameTouched(true);
          setUsername(e.target.value.toLowerCase().replace(/\s/g, ""));
        }}
      />
      <div className="space-y-1.5">
        <div className="flex items-end gap-2">
          <div className="relative min-w-0 flex-1">
            <TextField
              label="Password"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              data-wiz-enter="self"
              onChange={(e) => setPassword(e.target.value)}
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <FilledButton
            type="button"
            variant="tonal"
            className="h-12 px-4"
            onClick={() => {
              setPassword(generatePassword());
              setShow(true);
            }}
          >
            <KeyRound className="h-4 w-4" /> Generate
          </FilledButton>
        </div>
        <p className="px-1 text-xs text-muted-foreground">At least 8 characters</p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <FilledButton type="button" variant="text" onClick={onCancel}>
            Cancel
          </FilledButton>
        )}
        <FilledButton type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create login"}
        </FilledButton>
      </div>
    </form>
  );
}
