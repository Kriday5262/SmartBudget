import { useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  AtSign,
  CalendarDays,
  Camera,
  Home,
  KeyRound,
  Loader2,
  Lock as LockIcon,
  Pencil,
  Trash2,
  User,
} from "lucide-react";
import {
  Category,
  FilledButton,
  Group,
  InlineForm,
  Row,
  TextField,
} from "@/components/MaterialList";
import { useHydrated } from "@/hooks/use-hydrated";
import { useActiveUser, updateProfile } from "@/lib/lock";
import { useDB, getActiveHousehold } from "@/lib/store";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "Profile | SmartBudget" },
      { name: "description", content: "Change your name and profile photo." },
    ],
  }),
});

const PHOTO_SIZE = 256;
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** Centre-crop an image file to a small square JPEG data URL. */
async function toAvatarDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("unreadable"));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = PHOTO_SIZE;
    canvas.height = PHOTO_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.drawImage(
      img,
      (img.naturalWidth - side) / 2,
      (img.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      PHOTO_SIZE,
      PHOTO_SIZE,
    );
    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ProfilePage() {
  const hydrated = useHydrated();
  const user = useActiveUser();
  const db = useDB();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);

  if (!hydrated || !user) return <div className="shimmer mx-auto h-96 max-w-2xl rounded-[28px]" />;

  const household = getActiveHousehold(db);
  const initial = user.name?.[0]?.toUpperCase() ?? "?";
  const memberSince = (() => {
    const d = new Date(user.createdAt);
    return Number.isNaN(d.getTime())
      ? null
      : d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  })();

  async function saveName() {
    const next = name.trim();
    if (!next) return toast.error("Enter your name");
    if (next.length > 60) return toast.error("Keep your name under 60 characters");
    if (next === user!.name) return setEditingName(false);
    setSavingName(true);
    const res = await updateProfile({ name: next });
    setSavingName(false);
    if (!res.ok) return toast.error(res.error ?? "Couldn't save your name");
    setEditingName(false);
    toast.success("Name updated");
  }

  async function onPhotoPicked(file: File) {
    if (!file.type.startsWith("image/")) return toast.error("Choose an image file");
    if (file.size > MAX_UPLOAD_BYTES) return toast.error("That image is too large (max 15 MB)");
    setSavingPhoto(true);
    try {
      const dataUrl = await toAvatarDataUrl(file);
      const res = await updateProfile({ avatarDataUrl: dataUrl });
      if (!res.ok) throw new Error(res.error);
      toast.success("Photo updated");
    } catch {
      toast.error("Couldn't use that photo. Try a different image.");
    } finally {
      setSavingPhoto(false);
    }
  }

  async function removePhoto() {
    setSavingPhoto(true);
    const res = await updateProfile({ avatarDataUrl: "" });
    setSavingPhoto(false);
    if (!res.ok) return toast.error(res.error ?? "Couldn't remove your photo");
    toast.success("Photo removed");
  }

  return (
    <div className="mx-auto max-w-2xl pb-16 animate-native-slide">
      <div className="-ml-1 pt-2">
        <Link
          to="/settings"
          aria-label="Back to settings"
          className="flex h-12 w-12 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
      </div>
      <h1 className="px-2 pb-2 pt-4 font-display text-[36px] font-normal leading-tight tracking-tight text-foreground sm:text-[44px]">
        Profile
      </h1>

      {/* Photo + name header */}
      <section className="mt-4 flex flex-col items-center rounded-[28px] bg-card px-6 pb-7 pt-8 text-center">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={savingPhoto}
          aria-label={user.avatarDataUrl ? "Change profile photo" : "Add profile photo"}
          className="group relative rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
        >
          <span className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-primary text-5xl font-semibold text-primary-foreground">
            {user.avatarDataUrl ? (
              <img src={user.avatarDataUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </span>
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-white opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
            {!savingPhoto && <Camera className="h-7 w-7" />}
          </span>
          {savingPhoto && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white">
              <Loader2 className="h-7 w-7 animate-spin" />
            </span>
          )}
          <span className="absolute bottom-0.5 right-0.5 flex h-9 w-9 items-center justify-center rounded-full border-4 border-card bg-primary text-primary-foreground">
            <Camera className="h-4 w-4" />
          </span>
        </button>

        <p className="mt-4 text-2xl text-foreground">{user.name}</p>
        <p className="text-sm text-muted-foreground">@{user.username}</p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <FilledButton
            variant="tonal"
            onClick={() => fileRef.current?.click()}
            disabled={savingPhoto}
          >
            <Camera className="h-4 w-4" /> {user.avatarDataUrl ? "Change photo" : "Add photo"}
          </FilledButton>
          {user.avatarDataUrl && (
            <FilledButton variant="text" onClick={removePhoto} disabled={savingPhoto}>
              <Trash2 className="h-4 w-4" /> Remove
            </FilledButton>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPhotoPicked(f);
            e.target.value = "";
          }}
        />
      </section>

      <Category>Personal info</Category>
      <Group>
        {editingName ? (
          <InlineForm
            submitLabel={savingName ? "Saving…" : "Save"}
            onCancel={() => setEditingName(false)}
            onSubmit={saveName}
          >
            <TextField
              label="Name"
              hint="This is how you appear to your household"
              autoFocus
              autoComplete="name"
              onFocus={(e) => e.currentTarget.select()}
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </InlineForm>
        ) : (
          <Row
            icon={User}
            title="Name"
            summary={user.name}
            onClick={() => {
              setName(user.name);
              setEditingName(true);
            }}
            trailing={<Pencil className="h-5 w-5 text-muted-foreground" />}
          />
        )}
        <Row
          icon={AtSign}
          title="Username"
          summary={`@${user.username} · used to sign in, can't be changed`}
          trailing={<LockIcon className="h-4 w-4 text-muted-foreground/70" />}
        />
      </Group>

      <Category>Account</Category>
      <Group>
        <Row icon={Home} title="Household" summary={household.name} />
        {memberSince && <Row icon={CalendarDays} title="Member since" summary={memberSince} />}
        <Row
          icon={KeyRound}
          title="Password & security"
          summary="Change your password"
          onClick={() => navigate({ to: "/settings", search: { section: "security" } })}
        />
      </Group>
    </div>
  );
}
