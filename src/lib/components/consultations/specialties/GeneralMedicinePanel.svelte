<script lang="ts">
	type Props = {
		data: Record<string, unknown>;
		onChange: (data: Record<string, unknown>) => void;
	};

	let { data, onChange }: Props = $props();

	let form = $state({
		generalCondition: '',
		mainSymptoms: '',
		clinicalSummary: ''
	});

	let initialized = $state(false);

	$effect(() => {
		if (initialized) {
			return;
		}

		form.generalCondition = String(data.generalCondition ?? '');
		form.mainSymptoms = String(data.mainSymptoms ?? '');
		form.clinicalSummary = String(data.clinicalSummary ?? '');

		initialized = true;
	});

	$effect(() => {
		if (!initialized) {
			return;
		}

		onChange({
			generalCondition: form.generalCondition,
			mainSymptoms: form.mainSymptoms,
			clinicalSummary: form.clinicalSummary
		});
	});
</script>

<div class="grid gap-5 md:grid-cols-2">
	<div>
		<label for="general-condition" class="mb-2 block text-sm font-bold text-slate-700">
			État général
		</label>

		<textarea
			id="general-condition"
			bind:value={form.generalCondition}
			rows="4"
			class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
		></textarea>
	</div>

	<div>
		<label for="main-symptoms" class="mb-2 block text-sm font-bold text-slate-700">
			Symptômes principaux
		</label>

		<textarea
			id="main-symptoms"
			bind:value={form.mainSymptoms}
			rows="4"
			class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
		></textarea>
	</div>

	<div class="md:col-span-2">
		<label for="clinical-summary" class="mb-2 block text-sm font-bold text-slate-700">
			Synthèse clinique
		</label>

		<textarea
			id="clinical-summary"
			bind:value={form.clinicalSummary}
			rows="5"
			class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
		></textarea>
	</div>
</div>
