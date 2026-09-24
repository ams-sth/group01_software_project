import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import { ApiError, login, register } from "../lib/api";
import { saveSession } from "../lib/session";

type Mode = "signin" | "create";

function EyeIcon({ isOpen }: { isOpen: boolean }) {
	if (isOpen) {
		return (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.8"
				className="h-4 w-4"
				aria-hidden="true"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"
				/>
				<circle cx="12" cy="12" r="3" />
			</svg>
		);
	}
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			className="h-4 w-4"
			aria-hidden="true"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M2 12s3.6-7 10-7c1.7 0 3.15.42 4.36 1.03M22 12s-3.6 7-10 7c-1.7 0-3.15-.42-4.36-1.03M4 4l16 16"
			/>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M9.9 9.9a3 3 0 0 0 4.2 4.2"
			/>
		</svg>
	);
}

function AuthenticationPage() {
	const navigate = useNavigate();
	const [mode, setMode] = useState<Mode>("signin");
	const [identifier, setIdentifier] = useState("");
	const [password, setPassword] = useState("");
	const [isPasswordVisible, setIsPasswordVisible] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setIsSubmitting(true);
		try {
			const auth =
				mode === "signin"
					? await login(identifier, password)
					: await register(identifier, password);
			saveSession(auth);
			navigate("/home");
		} catch (err) {
			setError(
				err instanceof ApiError
					? err.message
					: "Could not reach the server. Please try again.",
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<main className="grid min-h-svh grid-cols-1 lg:grid-cols-2">
			<div className="brand-gradient relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
				<div
					className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl"
					aria-hidden="true"
				/>
				<Link to="/" className="flex items-center gap-2 text-lg font-bold">
					<span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
						S
					</span>
					SplitSync
				</Link>
				<div className="relative flex max-w-md flex-col gap-4">
					<h2 className="text-4xl font-extrabold leading-tight">
						Split expenses. Stay friends.
					</h2>
					<p className="text-white/85">
						Track shared expenses with your housemates — who paid, who owes, and
						who's settled up, all in one place.
					</p>
				</div>
				<p className="relative text-sm text-white/70">
					© {new Date().getFullYear()} SplitSync
				</p>
			</div>

			<div className="relative flex flex-col items-center justify-center p-6 sm:p-10">
				<div className="absolute right-6 top-6 lg:right-10 lg:top-10">
					<ThemeToggle />
				</div>
				<div className="flex w-full max-w-sm flex-col gap-5">
					<h1 className="text-center text-[28px] font-semibold text-(--text-h) lg:hidden">
						SplitSync
					</h1>

					<div
						className="flex gap-0.75 rounded-lg border p-0.75 border-(--border)"
						role="tablist"
						aria-label="Sign in or create an account"
					>
						<button
							type="button"
							role="tab"
							aria-selected={mode === "signin"}
							onClick={() => setMode("signin")}
							className={`flex-1 rounded-md py-2 text-sm cursor-pointer ${
								mode === "signin"
									? "bg-(--accent) text-white"
									: "bg-transparent text-(--text)"
							}`}
						>
							Sign in
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={mode === "create"}
							onClick={() => setMode("create")}
							className={`flex-1 rounded-md py-2 text-sm cursor-pointer ${
								mode === "create"
									? "bg-(--accent) text-white"
									: "bg-transparent text-(--text)"
							}`}
						>
							Create account
						</button>
					</div>

					<form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
						<label htmlFor="identifier" className="text-[13px] text-(--text-h)">
							{mode === "signin" ? "Email or username" : "Email"}
						</label>
						<input
							id="identifier"
							name="identifier"
							type={mode === "signin" ? "text" : "email"}
							placeholder={
								mode === "signin"
									? "you@example.com or username"
									: "you@example.com"
							}
							autoComplete={mode === "signin" ? "username" : "email"}
							required
							value={identifier}
							onChange={(event) => setIdentifier(event.target.value)}
							className="rounded-lg border px-3 py-2.5 text-sm bg-(--surface) border-(--border) text-(--text-h) focus:outline-2 focus:outline-offset-1 focus:outline-(--accent-border)"
						/>
						{mode === "create" && (
							<p className="mt-1 text-xs text-(--text)">
								We'll generate a username for you automatically — after that,
								you can sign in with either your email or your username.
							</p>
						)}

						<label
							htmlFor="password"
							className="mt-2.5 text-[13px] text-(--text-h)"
						>
							Password
						</label>
						<div className="relative">
							<input
								id="password"
								name="password"
								type={isPasswordVisible ? "text" : "password"}
								placeholder="••••••••"
								autoComplete={
									mode === "signin" ? "current-password" : "new-password"
								}
								required
								minLength={8}
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								className="w-full rounded-lg border px-3 py-2.5 pr-10 text-sm bg-(--surface) border-(--border) text-(--text-h) focus:outline-2 focus:outline-offset-1 focus:outline-(--accent-border)"
							/>
							<button
								type="button"
								onClick={() => setIsPasswordVisible((current) => !current)}
								aria-label={
									isPasswordVisible ? "Hide password" : "Show password"
								}
								aria-pressed={isPasswordVisible}
								className="absolute inset-y-0 right-0 flex cursor-pointer items-center px-3 text-(--text) hover:text-(--text-h)"
							>
								<EyeIcon isOpen={isPasswordVisible} />
							</button>
						</div>

						{error && (
							<p role="alert" className="mt-1 text-xs text-(--danger)">
								{error}
							</p>
						)}

						<button
							type="submit"
							disabled={isSubmitting}
							className="mt-3.5 cursor-pointer rounded-lg py-2.5 text-sm font-semibold text-white bg-(--accent) hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{isSubmitting
								? "Please wait…"
								: mode === "signin"
									? "Sign in"
									: "Create account"}
						</button>
					</form>

					<p className="text-center text-xs text-(--text)">
						Your password is hashed and never stored in plain text.
					</p>
				</div>
			</div>
		</main>
	);
}

export default AuthenticationPage;
