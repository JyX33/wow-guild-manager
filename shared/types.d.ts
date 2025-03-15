declare module 'wow-guild-manager-shared-types' {
  // Re-export all types from the type files
  export * from '@wow-guild-manager/shared/types/user';
  export * from '@wow-guild-manager/shared/types/guild';
  export * from '@wow-guild-manager/shared/types/event';
  export * from '@wow-guild-manager/shared/types/api';
  
  // Alternatively, just declare all types directly in this file
  export {
    UserRole,
    User,
    BattleNetUserProfile,
    Guild,
    GuildMember,
    Character,
    CharacterRole,
    Event,
    EventType,
    EventSubscription,
    EventSubscriptionStatus,
    EventParticipant,
    EventFormValues,
    ApiResponse,
    ApiError,
    ErrorCode,
    PaginationParams,
    PaginatedResponse,
    QueryFilters,
    SortOptions,
    SearchParams,
    HttpMethod,
    ApiRequestConfig
  };
}