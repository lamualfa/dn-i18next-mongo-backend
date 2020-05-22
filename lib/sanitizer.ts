// Remove MongoDB special character. See https://jira.mongodb.org/browse/SERVER-3229?focusedCommentId=36821&page=com.atlassian.jira.plugin.system.issuetabpanels:comment-tabpanel#comment-36821
const MONGODB_SPECIAL_CHARACTER_REGEX = /^\$|\./g;

export function sanitizeMongoDbFieldName(fieldName: string): string {
  return fieldName.replace(MONGODB_SPECIAL_CHARACTER_REGEX, '');
}
