<script>
	import { page } from '$app/stores';
</script>

<h1 class="h1 p-4 block text-center">{$page.status} {$page.error?.message}</h1>
