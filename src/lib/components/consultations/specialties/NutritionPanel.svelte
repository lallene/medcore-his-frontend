<script lang="ts">
	type Props = {
		data: Record<string, unknown>;
		onChange: (data: Record<string, unknown>) => void;
	};

	let { data, onChange }: Props = $props();

	let form = $state({
		bmi: 0,
		waistCircumferenceCm: 0,
		dietaryHabits: '',
		nutritionGoal: '',
		dietPlan: ''
	});

	let initialized = $state(false);

	$effect(() => {
		if (initialized) {
			return;
		}

		form.bmi = Number(data.bmi ?? 0);
		form.waistCircumferenceCm = Number(data.waistCircumferenceCm ?? 0);
		form.dietaryHabits = String(data.dietaryHabits ?? '');
		form.nutritionGoal = String(data.nutritionGoal ?? '');
		form.dietPlan = String(data.dietPlan ?? '');

		initialized = true;
	});

	$effect(() => {
		if (!initialized) {
			return;
		}

		onChange({
			bmi: form.bmi,
			waistCircumferenceCm: form.waistCircumferenceCm,
			dietaryHabits: form.dietaryHabits,
			nutritionGoal: form.nutritionGoal,
			dietPlan: form.dietPlan
		});
	});
</script>

<div class="grid gap-5 md:grid-cols-2">
	<div>
		<label for="bmi" class="mb-2 block text-sm font-bold text-slate-700">IMC</label>
		<input
			id="bmi"
			type="number"
			step="0.1"
			bind:value={form.bmi}
			class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
		/>
	</div>

	<div>
		<label for="waist" class="mb-2 block text-sm font-bold text-slate-700"> Tour de taille </label>
		<input
			id="waist"
			type="number"
			step="0.1"
			bind:value={form.waistCircumferenceCm}
			class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
		/>
	</div>

	<div class="md:col-span-2">
		<label for="dietary-habits" class="mb-2 block text-sm font-bold text-slate-700">
			Habitudes alimentaires
		</label>
		<textarea
			id="dietary-habits"
			bind:value={form.dietaryHabits}
			rows="4"
			class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
		></textarea>
	</div>

	<div>
		<label for="nutrition-goal" class="mb-2 block text-sm font-bold text-slate-700">
			Objectif nutritionnel
		</label>
		<input
			id="nutrition-goal"
			type="text"
			bind:value={form.nutritionGoal}
			class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
		/>
	</div>

	<div>
		<label for="diet-plan" class="mb-2 block text-sm font-bold text-slate-700">
			Plan alimentaire
		</label>
		<input
			id="diet-plan"
			type="text"
			bind:value={form.dietPlan}
			class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
		/>
	</div>
</div>
