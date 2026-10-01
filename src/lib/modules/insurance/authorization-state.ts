/** Canonical authorization helpers — re-exported for module-path consumers. */
export {
	AUTHORIZATION_REFERENCE_TYPES,
	authorizationActions,
	authorizationActPresentation,
	authorizationReferenceLabel,
	authorizationStatusLabel,
	canCreatePerformedActPec,
	coverageSelectorLabel,
	finalAuthorizationStatuses,
	formatAuthorizationReferenceType,
	hasAuthorizationPermission,
	initialCoverageIdForCreate,
	mapAuthorizationConflictMessage,
	performedActPecDeepLink,
	previewDecision,
	requestedAmountFromPerformedActBasePrice,
	requiresExplicitCoverageSelection
} from '../../components/insurance/authorization-state.ts';
