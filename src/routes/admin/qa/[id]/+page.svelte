<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { getQACampaign, getQATestResults } from '$lib/api/qa';
	import type { QACampaign, QATestResult } from '$lib/types/qa';
	let campaign = $state<QACampaign | null>(null),
		results = $state<QATestResult[]>([]),
		error = $state('');
	onMount(async () => {
		try {
			const id = Number(page.params.id);
			[campaign, results] = await Promise.all([getQACampaign(id), getQATestResults(id)]);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Campagne introuvable';
		}
	});
</script>

<svelte:head><title>Campagne QA — MedCore HIS</title></svelte:head>
<div class="space-y-6 p-6">
	{#if error}<p class="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>{:else if campaign}<header>
			<p class="text-xs font-black uppercase text-indigo-700">{campaign.environment}</p>
			<h1 class="text-3xl font-black">{campaign.runId}</h1>
			<p>
				{campaign.status} · {campaign.passed}/{campaign.total} passés · {(
					campaign.durationMs / 1000
				).toFixed(1)} s
			</p>
		</header>
		<div class="space-y-3">
			{#each results as result (result.id)}<article class="rounded-2xl border bg-white p-4">
					<div class="flex justify-between">
						<div>
							<p class="text-xs font-bold uppercase text-slate-400">
								{result.suite} · {result.testKey}
							</p>
							<h2 class="font-black">{result.title}</h2>
						</div>
						<b
							class:text-red-700={result.status === 'FAILED'}
							class:text-emerald-700={result.status === 'PASSED'}>{result.status}</b
						>
					</div>
					{#if result.errorMessage}<pre
							class="mt-3 overflow-auto rounded-xl bg-red-50 p-3 text-xs text-red-800">{result.errorMessage}</pre>{/if}{#if result.artifacts?.length}<div
							class="mt-3 flex flex-wrap gap-2"
						>
							{#each result.artifacts as artifact (artifact.id)}<!-- eslint-disable-next-line svelte/no-navigation-without-resolve --><a
									href={artifact.location}
									class="rounded-lg border px-3 py-2 text-sm"
									target="_blank"
									rel="noreferrer">{artifact.type}: {artifact.name}</a
								>{/each}
						</div>{/if}
				</article>{/each}
		</div>
		{#if campaign.artifacts?.length}<section>
				<h2 class="font-black">Artefacts campagne</h2>
				{#each campaign.artifacts as artifact (artifact.id)}<!-- eslint-disable-next-line svelte/no-navigation-without-resolve --><a
						href={artifact.location}
						class="mr-2 text-indigo-700"
						target="_blank"
						rel="noreferrer">{artifact.name}</a
					>{/each}
			</section>{/if}{/if}
</div>
