<script lang="ts">
	import { goto } from '$app/navigation';
	import { modalStore } from '@skeletonlabs/skeleton';
	import { loading } from '$lib/stores/loading';
	import { user } from '$lib/stores/user';
	import { auth } from '$lib/stores/auth';
	import type { AuthError, ProviderId } from 'firebase/auth';
	import Google from '$lib/components/icons/Google.svelte';
	import Apple from '$lib/components/icons/Apple.svelte';

	let promptForReauthentication = false;
	let showEmailConfirmation = false;
	let providerId: typeof ProviderId;

	const confirmDelete = () =>
		loading.whileAwaiting(async () => {
			const {
				AuthErrorCodes,
				EmailAuthProvider,
				isSignInWithEmailLink,
				ProviderId,
				reauthenticateWithCredential
			} = await import('firebase/auth');

			providerId = ProviderId;

			if (isSignInWithEmailLink($auth, window.location.href)) {
				/* eslint-disable @typescript-eslint/no-non-null-assertion */
				const credential = EmailAuthProvider.credentialWithLink(
					$user!.email!,
					window.location.href
				);

				await reauthenticateWithCredential($user!, credential);
				/* eslint-enable @typescript-eslint/no-non-null-assertion */
			}

			if (
				(window as typeof window & { FORCE_ACCOUNT_DELETION_REAUTHENTICATION?: boolean })
					.FORCE_ACCOUNT_DELETION_REAUTHENTICATION
			) {
				promptForReauthentication = true;
				return;
			}

			try {
				await $user?.delete();
				await goto('/list');
				closeModal();
			} catch (error) {
				if ((error as AuthError).code !== AuthErrorCodes.CREDENTIAL_TOO_OLD_LOGIN_AGAIN) {
					promptForReauthentication = true;
					return;
				}

				throw error;
			}
		});

	const sendSignInLink = () =>
		loading.whileAwaiting(async () => {
			if (!$user || !$user.email || !$auth) {
				return;
			}

			const { sendSignInLinkToEmail } = await import('firebase/auth');

			await sendSignInLinkToEmail($auth, $user.email, {
				url: window.location.href,
				handleCodeInApp: true
			});

			showEmailConfirmation = true;
		});

	const signInWithGoogle = () =>
		loading.whileAwaiting(async () => {
			const { GoogleAuthProvider, reauthenticateWithRedirect } = await import('firebase/auth');

			const provider = new GoogleAuthProvider();

			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			await reauthenticateWithRedirect($user!, provider);
		});

	const signInWithApple = () =>
		loading.whileAwaiting(async () => {
			const { OAuthProvider, reauthenticateWithRedirect } = await import('firebase/auth');

			const provider = new OAuthProvider('apple.com');

			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			await reauthenticateWithRedirect($user!, provider);
		});

	const closeModal = () => modalStore.close();
</script>

<div class="card p-4" aria-live="polite">
	{#if !promptForReauthentication}
		<p>Are you sure you want to delete your account?</p>
		<p><strong>This can not be undone</strong></p>
		<div class="mt-4 flex gap-4 justify-center">
			<button
				class="btn bg-gradient-to-br variant-filled-error"
				disabled={$loading}
				on:click={confirmDelete}
			>
				Delete
			</button>
			<button class="btn variant-soft" disabled={$loading} on:click={closeModal}>Cancel</button>
		</div>
	{:else}
		<div class="flex flex-col gap-4 items-center text-center">
			{#if showEmailConfirmation}
				<p>Email sent, please check your inbox for a sign in link</p>
			{:else}
				<p>Please reauthenticate to delete your account</p>
				<div class="flex flex-col gap-4 justify-center">
					{#if $user?.providerData.find((provider) => provider.providerId === providerId.PASSWORD)}
						<button
							class="btn bg-surface-900-50-token text-surface-50-900-token"
							disabled={$loading}
							on:click={sendSignInLink}
						>
							Send sign in link
						</button>
					{/if}
					{#if $user?.providerData.find((provider) => provider.providerId === providerId.GOOGLE)}
						<button
							disabled={$loading}
							class="btn bg-surface-900-50-token text-surface-50-900-token flex gap-2"
							on:click={signInWithGoogle}
						>
							<Google classes="w-6 h-6" />
							<span>Sign in with Google</span>
						</button>
					{/if}

					{#if $user?.providerData.find((provider) => provider.providerId === 'apple.com')}
						<button
							disabled={$loading}
							class="btn bg-surface-900-50-token text-surface-50-900-token flex gap-2"
							on:click={signInWithApple}
						>
							<Apple classes="w-6 h-6" />
							<span>Sign in with Apple</span>
						</button>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>