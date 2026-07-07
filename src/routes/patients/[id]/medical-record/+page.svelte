<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { getPatientMedicalSummary } from '$lib/api/medical-records';
	import type { PatientMedicalSummary, MedicalTimelineEvent } from '$lib/types/medical-record';
	import { resolve } from '$app/paths';
    import { api } from '$lib/api/client';

	let loading = $state(true);
	let error = $state('');
	let summary = $state<PatientMedicalSummary | null>(null);
	let activeTab = $state('timeline');

	let patientId = $derived(Number($page.params.id));

	onMount(async () => {
		try {
			summary = await getPatientMedicalSummary(patientId);
		} catch {
            error = 'Impossible de charger le dossier médical.';
        } finally {
			loading = false;
		}
	});

	function formatDate(value: string) {
		return new Intl.DateTimeFormat('fr-FR', {
			dateStyle: 'short',
			timeStyle: 'short'
		}).format(new Date(value));
	}

	function severityClass(severity: string) {
		if (severity === 'high' || severity === 'critical') return 'bg-red-100 text-red-700';
		if (severity === 'medium') return 'bg-orange-100 text-orange-700';
		return 'bg-blue-100 text-blue-700';
	}

	function eventIcon(event: MedicalTimelineEvent) {
		if (event.category === 'consultation') return '🩺';
		if (event.category === 'exam') return '🧪';
		if (event.category === 'prescription') return '💊';
		if (event.category === 'vital_signs') return '📈';
		if (event.category === 'allergy') return '⚠️';
		return '📌';
	}

    let openingDocument = $state<string | null>(null);

    async function openMedicalDocument(url: string) {
        openingDocument = url;

        try {
            const response = await api.get(url, {
                responseType: 'blob'
            });

            const blobUrl = URL.createObjectURL(
                new Blob([response.data], { type: 'application/pdf' })
            );

            window.open(blobUrl, '_blank', 'noopener,noreferrer');

            setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
            }, 60_000);
        } catch {
            error = 'Impossible d’ouvrir le document médical.';
        } finally {
            openingDocument = null;
        }
    }
</script>

<div class="space-y-6 p-6">
	<div class="flex items-center justify-between">
		<div>
			<p class="text-sm font-semibold text-[#0E4C92]">Dossier médical patient</p>
			<h1 class="text-2xl font-black text-slate-900">
				Dossier #{summary?.medical_record.record_number ?? '...'}
			</h1>
		</div>

		<a
			href={resolve('/patients/[id]', { id: String(patientId) })}
			class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
		>
			Retour patient
		</a>
	</div>

	{#if loading}
		<div class="rounded-2xl bg-white p-6 shadow-sm">Chargement du dossier médical...</div>
	{:else if error}
		<div class="rounded-2xl bg-red-50 p-6 font-semibold text-red-700">{error}</div>
	{:else if summary}
		<div class="grid gap-4 md:grid-cols-4">
			<div class="rounded-2xl bg-white p-5 shadow-sm">
				<p class="text-xs font-bold uppercase text-slate-400">Statut</p>
				<p class="mt-2 text-lg font-black text-emerald-600">{summary.medical_record.status}</p>
			</div>

			<div class="rounded-2xl bg-white p-5 shadow-sm">
				<p class="text-xs font-bold uppercase text-slate-400">Allergies</p>
				<p class="mt-2 text-lg font-black text-slate-900">{summary.allergies.length}</p>
			</div>

			<div class="rounded-2xl bg-white p-5 shadow-sm">
				<p class="text-xs font-bold uppercase text-slate-400">Antécédents</p>
				<p class="mt-2 text-lg font-black text-slate-900">{summary.medical_histories.length}</p>
			</div>

			<div class="rounded-2xl bg-white p-5 shadow-sm">
				<p class="text-xs font-bold uppercase text-slate-400">Événements</p>
				<p class="mt-2 text-lg font-black text-slate-900">{summary.timeline.length}</p>
			</div>
		</div>

		{#if summary.allergies.length > 0}
			<div class="rounded-2xl border border-red-100 bg-red-50 p-5">
				<h2 class="font-black text-red-700">⚠️ Allergies connues</h2>

				<div class="mt-3 flex flex-wrap gap-2">
					{#each summary.allergies as allergy (allergy.id)}
						<div class="rounded-xl border border-slate-100 p-4">
							<p class="font-black text-slate-900">{allergy.allergen_name}</p>
							<p class="text-sm text-slate-600">{allergy.reaction}</p>
							<p class="mt-1 text-xs text-slate-400">{allergy.comment}</p>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<div class="grid gap-4 lg:grid-cols-3">
			<div class="rounded-2xl bg-white p-5 shadow-sm lg:col-span-2">
				<h2 class="font-black text-slate-900">Dernières constantes</h2>

				{#if summary.last_vital_signs}
					<div class="mt-4 grid gap-3 md:grid-cols-3">
						<div class="rounded-xl bg-slate-50 p-4">
							<p class="text-xs font-bold text-slate-400">TA</p>
							<p class="font-black">
								{summary.last_vital_signs.systolic_bp}/{summary.last_vital_signs.diastolic_bp}
							</p>
						</div>

						<div class="rounded-xl bg-slate-50 p-4">
							<p class="text-xs font-bold text-slate-400">Température</p>
							<p class="font-black">{summary.last_vital_signs.temperature_c ?? '-'} °C</p>
						</div>

						<div class="rounded-xl bg-slate-50 p-4">
							<p class="text-xs font-bold text-slate-400">SpO2</p>
							<p class="font-black">{summary.last_vital_signs.oxygen_saturation ?? '-'} %</p>
						</div>

						<div class="rounded-xl bg-slate-50 p-4">
							<p class="text-xs font-bold text-slate-400">Poids</p>
							<p class="font-black">{summary.last_vital_signs.weight_kg ?? '-'} kg</p>
						</div>

						<div class="rounded-xl bg-slate-50 p-4">
							<p class="text-xs font-bold text-slate-400">Taille</p>
							<p class="font-black">{summary.last_vital_signs.height_cm ?? '-'} cm</p>
						</div>

						<div class="rounded-xl bg-slate-50 p-4">
							<p class="text-xs font-bold text-slate-400">IMC</p>
							<p class="font-black">
								{summary.last_vital_signs.bmi ? summary.last_vital_signs.bmi.toFixed(1) : '-'}
							</p>
						</div>
					</div>
				{:else}
					<p class="mt-4 text-sm text-slate-500">Aucune constante enregistrée.</p>
				{/if}
			</div>

			<div class="rounded-2xl bg-white p-5 shadow-sm">
				<h2 class="font-black text-slate-900">Résumé rapide</h2>
				<div class="mt-4 space-y-3 text-sm">
					<p>
						<span class="font-bold text-slate-500">Dossier :</span>
						{summary.medical_record.record_number}
					</p>
					<p>
						<span class="font-bold text-slate-500">Créé le :</span>
						{formatDate(summary.medical_record.created_at)}
					</p>
					<p>
						<span class="font-bold text-slate-500">Patient ID :</span>
						{summary.medical_record.patient_id}
					</p>
				</div>
			</div>
		</div>

		<div class="rounded-2xl bg-white shadow-sm">
			<div class="flex gap-2 border-b border-slate-100 p-4">
				{#each ['timeline', 'consultations', 'allergies', 'antecedents', 'documents'] as tab (tab)}
                    <button
                        class={`rounded-xl px-4 py-2 text-sm font-bold ${
                            activeTab === tab
                                ? 'bg-[#0E4C92] text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        onclick={() => (activeTab = tab)}
                    >
                        {tab === 'timeline'
                            ? 'Chronologie'
                            : tab === 'consultations'
                                ? 'Consultations'
                                : tab === 'allergies'
                                    ? 'Allergies'
                                    : tab === 'antecedents'
                                        ? 'Antécédents'
                                        : 'Documents'}
                    </button>
                {/each}
			</div>

			<div class="p-5">
				{#if activeTab === 'timeline'}
					<div class="space-y-4">
						{#each summary.timeline as event (event.id)}
							<div class="flex gap-4 rounded-2xl border border-slate-100 p-4">
								<div class="text-2xl">{eventIcon(event)}</div>

								<div class="flex-1">
									<div class="flex items-start justify-between gap-3">
										<div>
											<p class="font-black text-slate-900">{event.title}</p>
											<p class="mt-1 text-sm text-slate-600">{event.description}</p>
										</div>

										<span
											class={`rounded-full px-2 py-1 text-xs font-bold ${severityClass(event.severity)}`}
										>
											{event.severity}
										</span>
									</div>

									<p class="mt-2 text-xs font-semibold text-slate-400">
										{formatDate(event.event_date)}
									</p>
								</div>
							</div>
						{/each}

						{#if summary.timeline.length === 0}
							<p class="text-sm text-slate-500">Aucun événement médical.</p>
						{/if}
					</div>
				{/if}

                {#if activeTab === 'consultations'}
                    <div class="space-y-4">
                        {#each summary.recent_consultations as consultation (consultation.id)}
                            <div class="rounded-2xl border border-slate-100 p-5">
                                <div class="flex items-start justify-between gap-4">
                                    <div>
                                        <div class="flex flex-wrap items-center gap-2">
                                            <h3 class="font-black text-slate-900">
                                                {consultation.diagnosis || 'Consultation médicale'}
                                            </h3>

                                            <span class="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#0E4C92]">
                                                {consultation.service}
                                            </span>
                                        </div>

                                        <p class="mt-2 text-sm font-semibold text-slate-500">
                                            {consultation.doctor_name}
                                        </p>
                                    </div>

                                    <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                        {consultation.status === 'draft'
                                            ? 'Brouillon'
                                            : consultation.status === 'in_progress'
                                                ? 'En cours'
                                                : consultation.status === 'completed'
                                                    ? 'Terminée'
                                                    : consultation.status}
                                    </span>
                                </div>

                                {#if consultation.observations}
                                    <div class="mt-4 rounded-xl bg-slate-50 p-4">
                                        <p class="text-xs font-bold uppercase text-slate-400">Observations</p>
                                        <p class="mt-1 text-sm text-slate-700">{consultation.observations}</p>
                                    </div>
                                {/if}

                                {#if consultation.treatment}
                                    <div class="mt-3">
                                        <p class="text-xs font-bold uppercase text-slate-400">Traitement</p>
                                        <p class="mt-1 text-sm text-slate-700">{consultation.treatment}</p>
                                    </div>
                                {/if}

                                <p class="mt-4 text-xs font-semibold text-slate-400">
                                    {formatDate(consultation.created_at)}
                                </p>
                            </div>
                        {/each}

                        {#if summary.recent_consultations.length === 0}
                            <p class="text-sm text-slate-500">Aucune consultation enregistrée.</p>
                        {/if}
                    </div>
                {/if}

				{#if activeTab === 'allergies'}
					<div class="space-y-3">
						{#each summary.allergies as allergy (allergy.id)}
							<span
								class="rounded-full bg-white px-3 py-1 text-sm font-bold text-red-700 shadow-sm"
							>
								{allergy.allergen_name} — {allergy.reaction}
							</span>
						{/each}

						{#if summary.allergies.length === 0}
							<p class="text-sm text-slate-500">Aucune allergie.</p>
						{/if}
					</div>
				{/if}

				{#if activeTab === 'antecedents'}
					<div class="space-y-3">
						{#each summary.medical_histories as history (history.id)}
							<div class="rounded-xl border border-slate-100 p-4">
								<p class="font-black text-slate-900">{history.title}</p>
								<p class="text-sm text-slate-600">{history.description}</p>
								<p class="mt-1 text-xs text-slate-400">{history.type} • {history.status}</p>
							</div>
						{/each}

						{#if summary.medical_histories.length === 0}
							<p class="text-sm text-slate-500">Aucun antécédent enregistré.</p>
						{/if}
					</div>
				{/if}

                {#if activeTab === 'documents'}
                    <div class="grid gap-3 md:grid-cols-2">
                        {#each summary.documents as document (`${document.consultation_id}-${document.type}`)}
                            <div class="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 p-4">
                                <div>
                                    <p class="font-black text-slate-900">{document.label}</p>
                                    <p class="mt-1 text-xs font-semibold text-slate-400">
                                        Consultation #{document.consultation_id}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onclick={() => openMedicalDocument(document.url)}
                                    disabled={openingDocument === document.url}
                                    class="rounded-xl bg-[#0E4C92] px-4 py-2 text-sm font-bold text-white hover:bg-[#0b3d75] disabled:cursor-wait disabled:opacity-60"
                                >
                                    {openingDocument === document.url ? 'Ouverture...' : 'Ouvrir'}
                                </button>
                            </div>
                        {/each}

                        {#if summary.documents.length === 0}
                            <p class="text-sm text-slate-500">Aucun document disponible.</p>
                        {/if}
                    </div>
                {/if}
			</div>
		</div>
	{/if}
</div>
