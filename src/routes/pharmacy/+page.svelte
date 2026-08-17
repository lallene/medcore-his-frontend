<script lang="ts">
	import { onMount } from 'svelte';
	import { jwtDecode } from 'jwt-decode';
	import {
		Search,
		PackageCheck,
		SlidersHorizontal,
		ChevronRight,
		Boxes,
		Pill,
		History,
		Layers3,
		Printer,
		X
	} from 'lucide-svelte';
	import {
		dispenseVoucherLine,
		getPharmacyVoucher,
		getPharmacyVouchers,
		getPharmacyBatches,
		getPharmacyFamilies,
		getPharmacyStocks,
		getPresentationAvailability,
		getStockMovements
	} from '$lib/api/pharmacy';
	import type {
		MedicationFamily,
		PharmacyVoucher,
		PharmacyVoucherLine,
		PharmacyBatch,
		PharmacyStock,
		PresentationAvailability,
		StockMovement,
		StockStatus
	} from '$lib/types/pharmacy';
	import {
		batchState,
		familyMetrics,
		movementLabel,
		stockStatusLabel
	} from '$lib/components/pharmacy/state';
	import AuthorizationStatus from '$lib/components/insurance/AuthorizationStatus.svelte';
	import BillingActStatus from '$lib/components/billing/BillingActStatus.svelte';

	type Tab = 'queue' | 'stock' | 'medications' | 'families' | 'batches' | 'movements';
	type Claims = { role?: string; permissions?: string[] };
	let tab = $state<Tab>('queue'),
		loading = $state(true),
		error = $state(''),
		claims = $state<Claims | null>(null),
		dispensing = $state<number | null>(null);
	let vouchers = $state<PharmacyVoucher[]>([]),
		selectedVoucher = $state<PharmacyVoucher | null>(null),
		availability = $state<PresentationAvailability[]>([]),
		stocks = $state<PharmacyStock[]>([]),
		families = $state<MedicationFamily[]>([]),
		batches = $state<PharmacyBatch[]>([]),
		movements = $state<StockMovement[]>([]),
		quantities = $state<Record<number, number>>({});
	let query = $state(''),
		familyFilter = $state(''),
		formFilter = $state(''),
		stockFilter = $state(''),
		serviceFilter = $state(''),
		queueStatus = $state(''),
		batchFilter = $state(''),
		movementType = $state(''),
		movementUser = $state(''),
		period = $state('');
	const has = (permission: string) =>
		Boolean(
			claims &&
			(claims.role === 'admin' ||
				claims.permissions?.includes('*') ||
				claims.permissions?.includes(permission))
		);
	const canDispense = $derived(has('pharmacy.dispensation.create') || has('pharmacy.dispense'));
	const status = (value: string) => stockStatusLabel(value.toUpperCase() as StockStatus);
	const forms = $derived([...new Set(availability.map((i) => i.form).filter(Boolean))].sort());
	const services = $derived([...new Set(vouchers.map((i) => i.service).filter(Boolean))].sort());
	const prescribers = $derived(
		[...new Set(vouchers.map((i) => i.prescriber).filter(Boolean))].sort()
	);
	const metrics = $derived(familyMetrics(families, availability));
	const stats = $derived({
		pending: vouchers.filter((i) => !['COMPLETED', 'CANCELLED'].includes(i.status)).length,
		available: availability.filter((i) => i.stockStatus === 'AVAILABLE').length,
		low: availability.filter((i) => i.stockStatus === 'LOW_STOCK').length,
		out: availability.filter((i) => i.stockStatus === 'OUT_OF_STOCK').length,
		expiring: batches.filter((i) => batchState(i) === 'EXPIRING_SOON').length,
		expired: batches.filter((i) => batchState(i) === 'EXPIRED').length
	});
	const normalize = (value: string) =>
		value
			.toLocaleLowerCase('fr')
			.normalize('NFD')
			.replace(/\p{Diacritic}/gu, '');
	const matches = (...values: (string | number | undefined | null)[]) =>
		normalize(values.join(' ')).includes(normalize(query.trim()));
	const filteredVouchers = $derived(
		vouchers.filter(
			(i) =>
				matches(i.number, i.patientName, i.patientCode, i.prescriber, i.service) &&
				(!serviceFilter || i.service === serviceFilter) &&
				(!queueStatus || i.status === queueStatus) &&
				(!movementUser || i.prescriber === movementUser) &&
				(!period || i.createdAt.startsWith(period))
		)
	);
	const filteredStock = $derived(
		stocks.filter((i) => {
			const a = availability.find((p) => p.presentationId === i.presentationId);
			return (
				matches(
					i.presentation.medication.name,
					i.presentation.medication.genericName,
					a?.family,
					i.presentation.form
				) &&
				(!familyFilter || a?.family === familyFilter) &&
				(!formFilter || i.presentation.form === formFilter) &&
				(!stockFilter || a?.stockStatus === stockFilter)
			);
		})
	);
	const filteredCatalogue = $derived(
		availability.filter(
			(i) =>
				matches(i.commercialName, i.genericName, i.family, i.form, i.dosage) &&
				(!familyFilter || i.family === familyFilter) &&
				(!formFilter || i.form === formFilter)
		)
	);
	const filteredBatches = $derived(
		batches.filter(
			(i) =>
				matches(
					i.batchNumber,
					i.presentation.medication.name,
					i.presentation.medication.genericName,
					i.presentation.dosage
				) &&
				(!batchFilter || batchState(i) === batchFilter)
		)
	);
	const filteredMovements = $derived(
		movements.filter(
			(i) =>
				matches(
					i.presentation.medication.name,
					i.presentation.medication.genericName,
					i.batch?.batchNumber,
					i.performedByName
				) &&
				(!movementType || i.type === movementType) &&
				(!movementUser || i.performedByName === movementUser) &&
				(!period || i.createdAt.startsWith(period))
		)
	);
	function fefoBatch(presentationId: number) {
		return batches
			.filter(
				(b) =>
					b.presentationId === presentationId &&
					b.isActive &&
					b.quantityRemaining > 0 &&
					batchState(b) !== 'EXPIRED'
			)
			.sort(
				(a, b) =>
					(a.expirationDate ? new Date(a.expirationDate).getTime() : Infinity) -
					(b.expirationDate ? new Date(b.expirationDate).getTime() : Infinity)
			)[0];
	}
	function nextExpiration(presentationId: number) {
		return fefoBatch(presentationId)?.expirationDate ?? null;
	}
	function date(value: string | null) {
		return value
			? new Intl.DateTimeFormat('fr-FR', {
					dateStyle: 'medium',
					timeStyle: value.includes('T') ? 'short' : undefined
				}).format(new Date(value))
			: '—';
	}
	function setTab(value: Tab) {
		tab = value;
		query = '';
		familyFilter = '';
		formFilter = '';
		stockFilter = '';
		serviceFilter = '';
		queueStatus = '';
		batchFilter = '';
		movementType = '';
		movementUser = '';
		period = '';
	}
	function showFamily(name: string) {
		setTab('medications');
		familyFilter = name;
	}
	async function load() {
		loading = true;
		error = '';
		try {
			const voucherResult = await getPharmacyVouchers();
			[availability, stocks, families, batches, movements] = await Promise.all([
				getPresentationAvailability(),
				getPharmacyStocks(),
				getPharmacyFamilies(),
				getPharmacyBatches(),
				getStockMovements()
			]);
			vouchers = voucherResult.items;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Chargement impossible';
		} finally {
			loading = false;
		}
	}
	async function openVoucher(id: number) {
		selectedVoucher = await getPharmacyVoucher(id);
		for (const line of selectedVoucher.lines ?? [])
			quantities[line.prescriptionId] = line.remainingQuantity;
	}
	async function dispenseLine(line: PharmacyVoucherLine) {
		const quantity = quantities[line.prescriptionId] ?? 0;
		if (quantity <= 0 || quantity > line.remainingQuantity) return;
		dispensing = line.prescriptionId;
		try {
			await dispenseVoucherLine(line, quantity);
			await load();
			await openVoucher(selectedVoucher!.id);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Dispensation impossible';
		} finally {
			dispensing = null;
		}
	}
	onMount(() => {
		const token = localStorage.getItem('medcore_token');
		if (token) claims = jwtDecode(token);
		void load();
	});
</script>

<svelte:head><title>Pharmacie · MedCore HIS</title></svelte:head>
<div class="space-y-4">
	<header>
		<p class="text-xs font-black uppercase tracking-[.16em] text-emerald-700">
			Circuit du médicament
		</p>
		<h1 class="text-3xl font-black text-slate-950">Pharmacie</h1>
		<p class="text-sm text-slate-500">Circuit du médicament et gestion opérationnelle du stock</p>
	</header>
	<section class="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
		{#each [[stats.pending, 'À dispenser', 'text-blue-700'], [stats.available, 'Disponibles', 'text-emerald-700'], [stats.low, 'Stock faible', 'text-amber-700'], [stats.out, 'Ruptures', 'text-red-700'], [stats.expiring, 'Bientôt périmés', 'text-orange-700'], [stats.expired, 'Lots expirés', 'text-rose-700']] as metric (metric[1])}<div
				class="rounded-xl border bg-white px-4 py-3"
			>
				<p class="text-[10px] font-black uppercase tracking-wide text-slate-500">{metric[1]}</p>
				<p class={`mt-1 text-2xl font-black ${metric[2]}`}>{metric[0]}</p>
			</div>{/each}
	</section>
	<nav class="flex gap-1 overflow-x-auto rounded-xl border bg-white p-1">
		{#each [['queue', 'File de dispensation'], ['stock', 'Stock'], ['medications', 'Médicaments'], ['families', 'Familles'], ['batches', 'Lots'], ['movements', 'Mouvements']] as item (item[0])}<button
				onclick={() => setTab(item[0] as Tab)}
				class:bg-emerald-700={tab === item[0]}
				class:text-white={tab === item[0]}
				class="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold text-slate-600"
				>{item[1]}</button
			>{/each}
	</nav>
	{#if error}<p
			class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700"
		>
			{error}
		</p>{/if}
	{#if loading}<section class="rounded-xl border bg-white p-12 text-center text-sm text-slate-500">
			Chargement de l’espace pharmacie…
		</section>{:else}
		<section class="rounded-xl border bg-white">
			<header class="flex flex-wrap items-center gap-2 border-b bg-slate-50/70 p-3">
				<SlidersHorizontal size={16} class="text-slate-400" /><label
					class="relative min-w-0 basis-full flex-1 sm:min-w-56 sm:basis-auto"
					><Search size={16} class="absolute left-3 top-2.5 text-slate-400" /><input
						bind:value={query}
						class="h-9 w-full rounded-lg border bg-white pl-9 pr-3 text-sm"
						placeholder={tab === 'queue'
							? 'Patient ou médicament…'
							: tab === 'movements'
								? 'Médicament, lot ou utilisateur…'
								: 'Nom commercial, DCI, famille…'}
					/></label
				>
				{#if ['stock', 'medications'].includes(tab)}<select
						bind:value={familyFilter}
						class="h-9 rounded-lg border bg-white px-3 text-sm"
						><option value="">Toutes les familles</option>{#each families as f (f.id)}<option
								value={f.name}>{f.name}</option
							>{/each}</select
					>{/if}
				{#if tab === 'queue'}<select
						bind:value={serviceFilter}
						class="h-9 rounded-lg border bg-white px-3 text-sm"
						><option value="">Tous les services</option>{#each services as service (service)}<option
								>{service}</option
							>{/each}</select
					><select bind:value={movementUser} class="h-9 rounded-lg border bg-white px-3 text-sm"
						><option value="">Tous les prescripteurs</option
						>{#each prescribers as doctor (doctor)}<option>{doctor}</option>{/each}</select
					><select bind:value={queueStatus} class="h-9 rounded-lg border bg-white px-3 text-sm"
						><option value="">Tous les statuts</option><option value="PENDING">À dispenser</option
						><option value="PARTIAL">Partielle</option><option value="COMPLETED">Dispensée</option
						><option value="CANCELLED">Annulée</option></select
					><input
						aria-label="Date du bon"
						type="date"
						bind:value={period}
						class="h-9 rounded-lg border bg-white px-3 text-sm"
					/>
				{/if}
				{#if tab === 'stock'}<select
						bind:value={stockFilter}
						class="h-9 rounded-lg border bg-white px-3 text-sm"
						><option value="">Toutes disponibilités</option><option value="AVAILABLE"
							>Disponible</option
						><option value="PARTIAL_AVAILABLE">Partiellement disponible</option><option
							value="LOW_STOCK">Stock faible</option
						><option value="OUT_OF_STOCK">Rupture</option></select
					>{/if}
				{#if ['stock', 'medications'].includes(tab)}<select
						bind:value={formFilter}
						class="h-9 rounded-lg border bg-white px-3 text-sm"
						><option value="">Toutes les formes</option>{#each forms as form (form)}<option
								>{form}</option
							>{/each}</select
					>{/if}
				{#if tab === 'batches'}<select
						bind:value={batchFilter}
						class="h-9 rounded-lg border bg-white px-3 text-sm"
						><option value="">Tous les états</option><option value="VALID">Valides</option><option
							value="EXPIRING_SOON">Bientôt périmés</option
						><option value="EXPIRED">Expirés</option><option value="DEPLETED">Épuisés</option
						></select
					>{/if}
				{#if tab === 'movements'}<select
						bind:value={movementType}
						class="h-9 rounded-lg border bg-white px-3 text-sm"
						><option value="">Tous les types</option
						>{#each [...new Set(movements.map((i) => i.type))] as type (type)}<option>{type}</option
							>{/each}</select
					><select bind:value={movementUser} class="h-9 rounded-lg border bg-white px-3 text-sm"
						><option value="">Tous les utilisateurs</option>{#each [...new Set(movements
									.map((i) => i.performedByName)
									.filter(Boolean))] as user (user)}<option>{user}</option>{/each}</select
					><input
						aria-label="Période"
						type="month"
						bind:value={period}
						class="h-9 rounded-lg border bg-white px-3 text-sm"
					/>{/if}
			</header>

			{#if tab === 'queue'}
				<div
					class="hidden grid-cols-[.8fr_1.2fr_.8fr_1fr_1fr_.7fr_.55fr_.8fr] gap-3 border-b px-4 py-2 text-[10px] font-black uppercase text-slate-400 lg:grid"
				>
					<span>Bon</span><span>Patient</span><span>Consultation</span><span>Service</span><span
						>Prescripteur</span
					><span>Date</span><span>Lignes</span><span>Statut / Action</span>
				</div>
				<div class="divide-y">
					{#each filteredVouchers as voucher (voucher.id)}
						<article
							class="grid gap-2 p-4 lg:grid-cols-[.8fr_1.2fr_.8fr_1fr_1fr_.7fr_.55fr_.8fr] lg:items-center"
						>
							<b class="text-emerald-800">{voucher.number}</b>
							<div>
								<b>{voucher.patientName}</b><small class="block text-slate-500"
									>{voucher.patientCode}</small
								>
							</div>
							<span>#{voucher.consultationId}</span><span>{voucher.service}</span><span
								>{voucher.prescriber}</span
							><span>{date(voucher.createdAt)}</span>
							<span>{voucher.lineCount} médicament(s)</span>
							<div>
								<span class="block text-xs font-black">{voucher.status}</span><button
									onclick={() => openVoucher(voucher.id)}
									class="mt-1 text-xs font-bold text-emerald-700"
									>Ouvrir <ChevronRight class="inline" size={13} /></button
								>
							</div>
						</article>
					{:else}<div class="p-12 text-center">
							<PackageCheck class="mx-auto text-emerald-200" size={34} />
							<h3 class="mt-3 font-black">Aucun bon à traiter</h3>
							<p class="text-sm text-slate-500">Aucun bon pharmacie ne correspond aux filtres.</p>
						</div>{/each}
				</div>
			{:else if tab === 'stock'}
				<div class="overflow-x-auto">
					<table class="w-full min-w-[900px] text-left text-sm">
						<thead class="bg-slate-50 text-[10px] uppercase text-slate-400"
							><tr
								><th class="p-3">Nom commercial / DCI</th><th>Famille</th><th>Forme / dosage</th><th
									>Stock</th
								><th>Seuil</th><th>Statut</th><th>Prochaine expiration</th><th>Action</th></tr
							></thead
						><tbody
							>{#each filteredStock as item (item.id)}{@const a = availability.find(
									(p) => p.presentationId === item.presentationId
								)}<tr class="border-t"
									><td class="p-3"
										><b class="text-slate-950">{item.presentation.medication.name}</b
										>{#if item.presentation.medication.genericName}<small
												class="block text-slate-500"
												>DCI : {item.presentation.medication.genericName}</small
											>{/if}</td
									><td>{a?.family || '—'}</td><td
										>{item.presentation.form}<small class="block"
											>{item.presentation.dosage} · {item.presentation.route}</small
										></td
									><td class="font-black">{item.quantityAvailable} {item.presentation.unit}</td><td
										>{item.alertThreshold}</td
									><td
										><span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold"
											>{status(a?.stockStatus ?? 'OUT_OF_STOCK')}</span
										></td
									><td>{date(nextExpiration(item.presentationId))}</td><td
										><button
											onclick={() => {
												setTab('batches');
												query = item.presentation.medication.name;
											}}
											class="text-xs font-bold text-emerald-700"
											>Voir lots <ChevronRight class="inline" size={13} /></button
										></td
									></tr
								>{:else}<tr
									><td colspan="8" class="p-12 text-center"
										><b>Aucun médicament en stock</b><small class="block text-slate-500"
											>Aucune ligne ne correspond aux filtres.</small
										></td
									></tr
								>{/each}</tbody
						>
					</table>
				</div>
			{:else if tab === 'medications'}
				<div class="divide-y">
					{#each families.filter((f) => !familyFilter || f.name === familyFilter) as family (family.id)}{@const familyItems =
							filteredCatalogue.filter(
								(i) => i.family === family.name
							)}{#if familyItems.length}<details open class="group p-3">
								<summary
									class="flex cursor-pointer list-none items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
									><span class="font-black uppercase text-slate-800">{family.name}</span><span
										class="text-xs text-slate-500">{familyItems.length} présentation(s)</span
									></summary
								>
								<div class="ml-3 border-l pl-3">
									{#each [...new Set(familyItems.map((i) => i.form))] as form (form)}<details
											open
											class="py-2"
										>
											<summary class="cursor-pointer text-sm font-black text-slate-600"
												>{form}
												<span class="font-normal"
													>· {familyItems.filter((i) => i.form === form).length}</span
												></summary
											>
											<div class="mt-1 divide-y rounded-lg border">
												{#each familyItems.filter((i) => i.form === form) as item (item.presentationId)}<div
														class="grid gap-2 px-3 py-2 sm:grid-cols-[1.2fr_1fr_auto] sm:items-center"
													>
														<div>
															<b>{item.commercialName}</b>{#if item.genericName}<small
																	class="block text-slate-500">DCI : {item.genericName}</small
																>{/if}
														</div>
														<span class="text-sm"
															>{item.dosage} · {item.route} · {item.packaging || '—'}</span
														><span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold"
															>{status(item.stockStatus)} · {item.availableQuantity}</span
														>
													</div>{/each}
											</div>
										</details>{/each}
								</div>
							</details>{/if}{:else}<div class="p-12 text-center">
							<Pill class="mx-auto text-slate-300" />
							<h3 class="mt-3 font-black">Aucun médicament trouvé</h3>
							<p class="text-sm text-slate-500">Modifiez les filtres du catalogue.</p>
						</div>{/each}
				</div>
			{:else if tab === 'families'}
				<div class="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
					{#each metrics as item (item.family.id)}<button
							onclick={() => showFamily(item.family.name)}
							class="rounded-xl border p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50/30"
							><div class="flex items-start justify-between">
								<div>
									<h3 class="font-black uppercase">{item.family.name}</h3>
									<p class="text-xs text-slate-500">{item.family.code}</p>
								</div>
								<Layers3 size={20} class="text-emerald-600" />
							</div>
							<p class="mt-3 text-sm">
								<b>{item.medications}</b> médicament(s) · <b>{item.presentations}</b> présentation(s)
							</p>
							<div class="mt-3 grid grid-cols-3 gap-1 text-center text-[10px] font-bold">
								<span class="rounded bg-emerald-50 p-2 text-emerald-700"
									>Disponible<br />{item.available}</span
								><span class="rounded bg-amber-50 p-2 text-amber-700">Faible<br />{item.low}</span
								><span class="rounded bg-red-50 p-2 text-red-700">Rupture<br />{item.out}</span>
							</div>
							<span class="mt-3 inline-flex items-center text-xs font-bold text-emerald-700"
								>Voir les médicaments <ChevronRight size={13} /></span
							></button
						>{:else}<div class="col-span-full p-12 text-center">
							<h3 class="font-black">Aucune famille</h3>
						</div>{/each}
				</div>
			{:else if tab === 'batches'}
				<div class="overflow-x-auto">
					<table class="w-full min-w-[850px] text-left text-sm">
						<thead class="bg-slate-50 text-[10px] uppercase text-slate-400"
							><tr
								><th class="p-3">Lot</th><th>Médicament / DCI</th><th>Présentation</th><th
									>Quantité</th
								><th>Expiration</th><th>État</th><th>Priorité FEFO</th></tr
							></thead
						><tbody
							>{#each filteredBatches as b (b.id)}{@const rank =
									batches
										.filter(
											(x) =>
												x.presentationId === b.presentationId &&
												x.isActive &&
												x.quantityRemaining > 0 &&
												batchState(x) !== 'EXPIRED'
										)
										.sort(
											(a, c) =>
												(a.expirationDate ? new Date(a.expirationDate).getTime() : Infinity) -
												(c.expirationDate ? new Date(c.expirationDate).getTime() : Infinity)
										)
										.findIndex((x) => x.id === b.id) + 1}<tr class="border-t"
									><td class="p-3 font-black">{b.batchNumber}</td><td
										><b>{b.presentation.medication.name}</b
										>{#if b.presentation.medication.genericName}<small class="block"
												>DCI : {b.presentation.medication.genericName}</small
											>{/if}</td
									><td>{b.presentation.dosage} · {b.presentation.form}</td><td class="font-black"
										>{b.quantityRemaining}</td
									><td>{date(b.expirationDate)}</td><td
										><span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold"
											>{batchState(b)}</span
										></td
									><td>{rank > 0 ? `FEFO #${rank}` : '—'}</td></tr
								>{:else}<tr
									><td colspan="7" class="p-12 text-center"
										><Boxes class="mx-auto text-slate-300" /><b class="mt-3 block"
											>Aucun lot enregistré</b
										><small class="text-slate-500">Aucun lot ne correspond aux filtres.</small></td
									></tr
								>{/each}</tbody
						>
					</table>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full min-w-[1000px] text-left text-sm">
						<thead class="bg-slate-50 text-[10px] uppercase text-slate-400"
							><tr
								><th class="p-3">Date</th><th>Médicament / DCI</th><th>Présentation</th><th>Lot</th
								><th>Type</th><th>Quantité</th><th>Avant</th><th>Après</th><th>Référence</th><th
									>Utilisateur</th
								></tr
							></thead
						><tbody
							>{#each filteredMovements as m (m.id)}{@const incoming = [
									'BATCH_ENTRY',
									'ADJUSTMENT_IN',
									'RETURN'
								].includes(m.type)}<tr class="border-t"
									><td class="p-3">{date(m.createdAt)}</td><td
										><b>{m.presentation.medication.name}</b
										>{#if m.presentation.medication.genericName}<small class="block"
												>DCI : {m.presentation.medication.genericName}</small
											>{/if}</td
									><td>{m.presentation.dosage} · {m.presentation.form}</td><td
										>{m.batch?.batchNumber || '—'}</td
									><td>{movementLabel(m.type)}</td><td
										class:!text-emerald-700={incoming}
										class:!text-red-700={!incoming}
										class="font-black">{incoming ? '+' : '−'}{m.quantity}</td
									><td>{m.stockBefore}</td><td>{m.stockAfter}</td><td
										>{m.referenceType || '—'}{m.referenceId ? ` #${m.referenceId}` : ''}</td
									><td>{m.performedByName || 'Système'}</td></tr
								>{:else}<tr
									><td colspan="10" class="p-12 text-center"
										><History class="mx-auto text-slate-300" /><b class="mt-3 block"
											>Aucun mouvement</b
										><small class="text-slate-500">Aucun événement ne correspond aux filtres.</small
										></td
									></tr
								>{/each}</tbody
						>
					</table>
				</div>
			{/if}
		</section>
	{/if}
	{#if selectedVoucher}
		<div
			class="fixed inset-0 z-50 flex justify-end bg-slate-950/35 print:static print:bg-white"
			role="presentation"
		>
			<section
				class="h-full w-full max-w-3xl overflow-y-auto bg-white p-6 shadow-2xl print:max-w-none print:shadow-none"
				aria-label="Détail du bon pharmacie"
			>
				<header class="flex items-start justify-between border-b pb-4">
					<div>
						<p class="text-xs font-black uppercase text-emerald-700">MedCore HIS · Bon pharmacie</p>
						<h2 class="text-2xl font-black">{selectedVoucher.number}</h2>
						<p class="text-sm text-slate-500">{selectedVoucher.status}</p>
					</div>
					<div class="flex gap-2 print:hidden">
						<button
							onclick={() => window.print()}
							class="rounded-lg border p-2"
							aria-label="Imprimer le bon"><Printer size={18} /></button
						><button
							onclick={() => (selectedVoucher = null)}
							class="rounded-lg border p-2"
							aria-label="Fermer"><X size={18} /></button
						>
					</div>
				</header>
				<div class="grid gap-3 border-b py-4 text-sm sm:grid-cols-2">
					<p><b>Patient</b><br />{selectedVoucher.patientName} · {selectedVoucher.patientCode}</p>
					<p>
						<b>Consultation</b><br />#{selectedVoucher.consultationId} · {selectedVoucher.service}
					</p>
					<p><b>Prescripteur</b><br />{selectedVoucher.prescriber}</p>
					<p>
						<b>Assurance</b><br />{selectedVoucher.isInsured
							? selectedVoucher.insuranceName
							: 'NON ASSURÉ'}<small class="block text-slate-500"
							>Information administrative — aucune décision PEC appliquée</small
						>
					</p>
				</div>
				<div class="divide-y">
					{#each selectedVoucher.lines ?? [] as line (line.id)}
						<article class="py-5">
							<h3 class="text-lg font-black">{line.commercialName}</h3>
							{#if line.genericName}<p class="text-sm text-slate-500">{line.genericName}</p>{/if}
							<p class="font-semibold">{line.dosage} · {line.form} · {line.route}</p>
							<div class="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
								<span>Prescrit <b>{line.prescribedQuantity}</b></span><span
									>Délivré <b>{line.dispensedQuantity}</b></span
								><span>Reste <b>{line.remainingQuantity}</b></span><span
									>{status(line.stockStatus)} <b>{line.availableQuantity}</b></span
								>
							</div>
							{#if selectedVoucher.isInsured}
								<div class="mt-3">
									<AuthorizationStatus
										patientId={selectedVoucher.patientId}
										referenceType="MEDICATION"
										referenceId={line.prescriptionId}
										service={selectedVoucher.service}
									/>
								</div>
							{:else}<p class="mt-3 rounded-xl bg-slate-100 p-3 text-sm font-bold">
									Patient non assuré
								</p>{/if}
							<BillingActStatus
								patientId={selectedVoucher.patientId}
								actType="MEDICATION"
								referenceId={line.prescriptionId}
							/>
							{#if canDispense && line.status !== 'COMPLETED' && selectedVoucher.status !== 'CANCELLED'}<div
									class="mt-3 flex items-end gap-2 print:hidden"
								>
									<label class="text-xs font-bold"
										>Quantité à délivrer<input
											type="number"
											min="0.01"
											max={Math.min(line.remainingQuantity, line.availableQuantity)}
											step="0.01"
											bind:value={quantities[line.prescriptionId]}
											class="mt-1 block h-9 w-28 rounded-lg border px-2"
										/></label
									><button
										disabled={dispensing === line.prescriptionId || line.availableQuantity <= 0}
										onclick={() => dispenseLine(line)}
										class="h-9 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-40"
										>Dispenser</button
									>
								</div>{/if}
						</article>
					{/each}
				</div>
				<footer class="mt-8 border-t pt-4 text-sm">
					<p>Date de délivrance : ____________________</p>
					<p>Pharmacien : ____________________</p>
				</footer>
			</section>
		</div>
	{/if}
</div>
