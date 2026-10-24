<script lang="ts">
	import { CreditCard, FileText, HeartPulse, Shield, Users } from 'lucide-svelte';
	import type { ActivityItem } from '$lib/types/dashboard';

	interface Props {
		activities?: ActivityItem[];
	}

	let { activities = [] }: Props = $props();

	function getActivityVisual(type: string) {
		if (type.includes('patient')) {
			return {
				icon: Users,
				iconClasses: 'bg-success-soft text-success-strong',
				lineClasses: 'border-success-border'
			};
		}

		if (type.includes('consultation')) {
			return {
				icon: HeartPulse,
				iconClasses: 'bg-primary-soft text-primary',
				lineClasses: 'border-primary-border'
			};
		}

		if (type.includes('workflow')) {
			return {
				icon: Shield,
				iconClasses: 'bg-info-soft text-info-strong',
				lineClasses: 'border-info-border'
			};
		}

		if (type.includes('voucher')) {
			return {
				icon: FileText,
				iconClasses: 'bg-warning-soft text-warning-strong',
				lineClasses: 'border-warning-border'
			};
		}

		if (type.includes('payment')) {
			return {
				icon: CreditCard,
				iconClasses: 'bg-success-soft text-success-strong',
				lineClasses: 'border-success-border'
			};
		}

		return {
			icon: Shield,
			iconClasses: 'bg-surface-muted text-muted-foreground',
			lineClasses: 'border-border'
		};
	}
</script>

<div class="rounded-2xl border border-border bg-surface p-6 shadow-xs">
	<div class="flex items-start justify-between gap-4">
		<div>
			<h2 class="text-lg font-semibold text-foreground">Activité récente</h2>
			<p class="mt-1 text-sm text-muted-foreground">Timeline opérationnelle</p>
		</div>

		<div
			class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info-strong"
			aria-hidden="true"
		>
			<HeartPulse size={18} />
		</div>
	</div>

	<div class="mt-6 space-y-5">
		{#each activities as activity, index (`${activity.time}-${activity.description}-${index}`)}
			{@const visual = getActivityVisual(activity.type)}
			{@const Icon = visual.icon}

			<div class={`relative border-l-2 pl-8 ${visual.lineClasses}`}>
				<div
					class={`absolute -left-[14px] top-0 flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-white ${visual.iconClasses}`}
				>
					<Icon size={15} aria-hidden="true" />
				</div>

				<p class="text-sm font-semibold text-foreground">{activity.description}</p>
				<p class="mt-1 text-xs text-muted-foreground">{activity.time} · {activity.type}</p>
			</div>
		{/each}
	</div>
</div>
