# Underscore Removal Report

## Files Renamed

| From                                 | To                                  |
| ------------------------------------ | ----------------------------------- |
| `supabase/.branches/_current_branch` | `supabase/.branches/current_branch` |

## Identifiers Replaced

### fix-eslint.sh

| From       | To        |
| ---------- | --------- |
| `(_error)` | `(error)` |
| `_error`   | `error`   |

### remove-underscores.js

| From              | To               |
| ----------------- | ---------------- |
| `var _name`       | `var name`       |
| `function _name`  | `function name`  |
| `class _Name`     | `class Name`     |
| `interface _Name` | `interface Name` |
| `type _Name`      | `type Name`      |

### src/components/accessibility/ContrastChecker.tsx

| From   | To    |
| ------ | ----- |
| `(_e)` | `(e)` |

### src/components/ai/AccessibleLoadingIndicator.tsx

| From                                         | To                                          |
| -------------------------------------------- | ------------------------------------------- |
| `interface _AccessibleLoadingIndicatorProps` | `interface AccessibleLoadingIndicatorProps` |

### src/components/ai/chat/ChatContainer.tsx

| From        | To         |
| ----------- | ---------- |
| `_name`     | `name`     |
| `_content:` | `content:` |

### src/components/ai/chat/useCrisisDetection.ts

| From                                   | To                                    |
| -------------------------------------- | ------------------------------------- |
| `const _reset`                         | `const reset`                         |
| `const _detectCrisis`                  | `const detectCrisis`                  |
| `const _requestBody`                   | `const requestBody`                   |
| `const _response`                      | `const response`                      |
| `const _errorData`                     | `const errorData`                     |
| `const _data`                          | `const data`                          |
| `const _detectBatch`                   | `const detectBatch`                   |
| `const _crisisDetected`                | `const crisisDetected`                |
| `const _firstCrisis`                   | `const firstCrisis`                   |
| `_error`                               | `error`                               |
| `interface _UseCrisisDetectionOptions` | `interface UseCrisisDetectionOptions` |
| `interface _UseCrisisDetectionResult`  | `interface UseCrisisDetectionResult`  |
| `_result:`                             | `result:`                             |
| `_text:`                               | `text:`                               |
| `_texts:`                              | `texts:`                              |

### src/components/blog/ArticleCard.astro

| From               | To                |
| ------------------ | ----------------- |
| `interface _Props` | `interface Props` |

### src/components/blog/ArticleHeader.astro

| From                   | To                    |
| ---------------------- | --------------------- |
| `const _formattedDate` | `const formattedDate` |
| `_Props`               | `Props`               |
| `_tag:`                | `tag:`                |

### src/components/blog/AuthorBio.astro

| From     | To      |
| -------- | ------- |
| `_Props` | `Props` |

### src/components/blog/Divider.astro

| From     | To      |
| -------- | ------- |
| `_Props` | `Props` |

### src/components/blog/SeriesNavigation.astro

| From     | To      |
| -------- | ------- |
| `_Props` | `Props` |

### src/components/blog/SocialShare.astro

| From     | To      |
| -------- | ------- |
| `_Props` | `Props` |

### src/components/blog/Subscribe.astro

| From     | To      |
| -------- | ------- |
| `_Props` | `Props` |

### src/components/blog/TableOfContents.astro

| From              | To               |
| ----------------- | ---------------- |
| `const _headings` | `const headings` |
| `const _tocList`  | `const tocList`  |
| `const _listItem` | `const listItem` |
| `const _link`     | `const link`     |
| `_Props`          | `Props`          |

### src/components/layout/Layout.tsx

| From                     | To                      |
| ------------------------ | ----------------------- |
| `interface _LayoutProps` | `interface LayoutProps` |

### src/components/security/SecurityDashboard.tsx

| From                    | To                     |
| ----------------------- | ---------------------- |
| `const _data`           | `const data`           |
| `const _severityCounts` | `const severityCounts` |
| `const _newAcc`         | `const newAcc`         |

### src/components/testing/BrowserCompatibilityTester.tsx

| From                        | To                         |
| --------------------------- | -------------------------- |
| `const _element`            | `const element`            |
| `_e`                        | `e`                        |
| `_element`                  | `element`                  |
| `interface _FeatureSupport` | `interface FeatureSupport` |
| `_property:`                | `property:`                |
| `(_featureTests)`           | `(featureTests)`           |
| `(_feature,`                | `(feature,`                |

### src/components/ui/AccessibilityAnnouncer.tsx

| From                                     | To                                      |
| ---------------------------------------- | --------------------------------------- |
| `const _timer`                           | `const timer`                           |
| `const _announcer`                       | `const announcer`                       |
| `_timer`                                 | `timer`                                 |
| `_announcer`                             | `announcer`                             |
| `interface _AccessibilityAnnouncerProps` | `interface AccessibilityAnnouncerProps` |
| `(_true)`                                | `(true)`                                |
| `(_false)`                               | `(false)`                               |
| `(_ms)`                                  | `(ms)`                                  |
| `(_message)`                             | `(message)`                             |

### src/components/ui/Button.astro

| From                    | To                     |
| ----------------------- | ---------------------- |
| `const _variantClasses` | `const variantClasses` |
| `const _sizeClasses`    | `const sizeClasses`    |
| `const _classes`        | `const classes`        |
| `_Props`                | `Props`                |

### src/components/ui/Footer.astro

| From                 | To                  |
| -------------------- | ------------------- |
| `const _currentYear` | `const currentYear` |

### src/components/ui/Navigation.astro

| From                      | To                       |
| ------------------------- | ------------------------ |
| `const _position`         | `const position`         |
| `const _navClasses`       | `const navClasses`       |
| `const _mobileMenuToggle` | `const mobileMenuToggle` |
| `const _mobileMenu`       | `const mobileMenu`       |
| `_Props`                  | `Props`                  |

### src/components/ui/ThemeToggle.astro

| From                  | To                   |
| --------------------- | -------------------- |
| `const _themeToggle`  | `const themeToggle`  |
| `const _sunIcon`      | `const sunIcon`      |
| `const _moonIcon`     | `const moonIcon`     |
| `const _systemIcon`   | `const systemIcon`   |
| `const _systemTheme`  | `const systemTheme`  |
| `const _savedTheme`   | `const savedTheme`   |
| `const _currentTheme` | `const currentTheme` |
| `_Props`              | `Props`              |
| `_theme:`             | `theme:`             |

### src/components/widgets/SpinningGlobe.astro

| From              | To               |
| ----------------- | ---------------- |
| `const _scene`    | `const scene`    |
| `const _camera`   | `const camera`   |
| `const _canvas`   | `const canvas`   |
| `const _renderer` | `const renderer` |
| `const _geometry` | `const geometry` |
| `const _material` | `const material` |
| `const _globe`    | `const globe`    |
| `_Props`          | `Props`          |
| `_class:`         | `class:`         |

### src/content/config.ts

| From                    | To                     |
| ----------------------- | ---------------------- |
| `const _blogCollection` | `const blogCollection` |
| `const _collections`    | `const collections`    |

### src/env.d.ts

| From                       | To                        |
| -------------------------- | ------------------------- |
| `interface _ImportMetaEnv` | `interface ImportMetaEnv` |
| `interface _ImportMeta`    | `interface ImportMeta`    |
| `interface _Locals`        | `interface Locals`        |

### src/layouts/AdminLayout.astro

| From                  | To                   |
| --------------------- | -------------------- |
| `const _canonicalURL` | `const canonicalURL` |
| `_Props`              | `Props`              |

### src/layouts/AuthLayout.astro

| From                  | To                   |
| --------------------- | -------------------- |
| `const _canonicalURL` | `const canonicalURL` |
| `_Props`              | `Props`              |

### src/layouts/BaseLayout.astro

| From                              | To                               |
| --------------------------------- | -------------------------------- |
| `const _canonicalURL`             | `const canonicalURL`             |
| `const _socialImageURL`           | `const socialImageURL`           |
| `const _defaultCriticalResources` | `const defaultCriticalResources` |
| `const _lcpResources`             | `const lcpResources`             |
| `const _containmentSelectors`     | `const containmentSelectors`     |
| `const _darkModeSetting`          | `const darkModeSetting`          |
| `const _script`                   | `const script`                   |
| `_Props`                          | `Props`                          |

### src/layouts/BlogPostLayout.astro

| From                | To                 |
| ------------------- | ------------------ |
| `const _date`       | `const date`       |
| `const _title`      | `const title`      |
| `const _formatDate` | `const formatDate` |
| `_Props`            | `Props`            |
| `_tag`              | `tag`              |
| `_date`             | `date`             |
| `_title`            | `title`            |

### src/layouts/ChatLayout.astro

| From     | To      |
| -------- | ------- |
| `_Props` | `Props` |

### src/layouts/StandardLayout.astro

| From     | To      |
| -------- | ------- |
| `_Props` | `Props` |

### src/lib/ai/models/registry.ts

| From                   | To                    |
| ---------------------- | --------------------- |
| `const _capableModels` | `const capableModels` |
| `const _chatModels`    | `const chatModels`    |
| `_capableModels`       | `capableModels`       |
| `_chatModels`          | `chatModels`          |
| `_id:`                 | `id:`                 |
| `_provider:`           | `provider:`           |
| `_capability:`         | `capability:`         |
| `(_capability)`        | `(capability)`        |

### src/lib/ai/performance-tracker.ts

| From                           | To                            |
| ------------------------------ | ----------------------------- |
| `const _requestCount`          | `const requestCount`          |
| `const _successCount`          | `const successCount`          |
| `const _cachedCount`           | `const cachedCount`           |
| `const _optimizedCount`        | `const optimizedCount`        |
| `const _uniqueModels`          | `const uniqueModels`          |
| `interface _PerformanceMetric` | `interface PerformanceMetric` |
| `_days:`                       | `days:`                       |

### src/lib/ai/services/fallback-service.ts

| From        | To         |
| ----------- | ---------- |
| `_error`    | `error`    |
| `_attempt:` | `attempt:` |

### src/lib/auth/session.d.ts

| From                     | To                      |
| ------------------------ | ----------------------- |
| `interface _SessionData` | `interface SessionData` |
| `_user:`                 | `user:`                 |

### src/lib/crypto/example.ts

| From                   | To                    |
| ---------------------- | --------------------- |
| `const _crypto`        | `const crypto`        |
| `const _sensitiveData` | `const sensitiveData` |
| `const _encrypted`     | `const encrypted`     |
| `const _decrypted`     | `const decrypted`     |
| `const _keyStorage`    | `const keyStorage`    |
| `const _rotatedKey`    | `const rotatedKey`    |
| `const _keys`          | `const keys`          |
| `const _scheduler`     | `const scheduler`     |
| `const _keyId`         | `const keyId`         |
| `const _reencrypted`   | `const reencrypted`   |
| `const _redecrypted`   | `const redecrypted`   |

### src/lib/crypto/keyRotation.ts

| From                        | To                         |
| --------------------------- | -------------------------- |
| `const _now`                | `const now`                |
| `const _existingMetadata`   | `const existingMetadata`   |
| `const _newVersion`         | `const newVersion`         |
| `const _metadata`           | `const metadata`           |
| `const _key`                | `const key`                |
| `const _version`            | `const version`            |
| `const _oldKey`             | `const oldKey`             |
| `const _decrypted`          | `const decrypted`          |
| `_keyId`                    | `keyId`                    |
| `_metadata`                 | `metadata`                 |
| `_key`                      | `key`                      |
| `class _KeyRotationManager` | `class KeyRotationManager` |
| `interface _KeyMetadata`    | `interface KeyMetadata`    |
| `_default:`                 | `default:`                 |
| `_newKey:`                  | `newKey:`                  |
| `_encryptedData:`           | `encryptedData:`           |

### src/lib/crypto/keyStorage.ts

| From                           | To                            |
| ------------------------------ | ----------------------------- |
| `const _data`                  | `const data`                  |
| `const _key`                   | `const key`                   |
| `const _keyId`                 | `const keyId`                 |
| `const _now`                   | `const now`                   |
| `const _existingKeyData`       | `const existingKeyData`       |
| `const _expiresInDays`         | `const expiresInDays`         |
| `const _newKey`                | `const newKey`                |
| `const _keys`                  | `const keys`                  |
| `_keyId`                       | `keyId`                       |
| `class _KeyStorage`            | `class KeyStorage`            |
| `interface _KeyStorageOptions` | `interface KeyStorageOptions` |
| `interface _StoredKeyData`     | `interface StoredKeyData`     |
| `_options:`                    | `options:`                    |
| `_purpose:`                    | `purpose:`                    |
| `_keyData:`                    | `keyData:`                    |

### src/lib/crypto/scheduledRotation.ts

| From                                  | To                                   |
| ------------------------------------- | ------------------------------------ |
| `const _allKeys`                      | `const allKeys`                      |
| `const _keyData`                      | `const keyData`                      |
| `const _now`                          | `const now`                          |
| `const _isExpired`                    | `const isExpired`                    |
| `const _rotatedKey`                   | `const rotatedKey`                   |
| `_error`                              | `error`                              |
| `_keyId`                              | `keyId`                              |
| `_options`                            | `options`                            |
| `class _ScheduledKeyRotation`         | `class ScheduledKeyRotation`         |
| `interface _ScheduledRotationOptions` | `interface ScheduledRotationOptions` |
| `_newKeyId:`                          | `newKeyId:`                          |

### src/lib/database.types.ts

| From                  | To                   |
| --------------------- | -------------------- |
| `interface _Database` | `interface Database` |

### src/lib/db/ai/schema.ts

| From                       | To                        |
| -------------------------- | ------------------------- |
| `const _supabaseUrl`       | `const supabaseUrl`       |
| `const _supabaseKey`       | `const supabaseKey`       |
| `const _supabase`          | `const supabase`          |
| `const _createAITablesSQL` | `const createAITablesSQL` |
| `_id`                      | `id`                      |

### src/lib/db/ai-metrics.ts

| From    | To     |
| ------- | ------ |
| `_data` | `data` |

### src/lib/db/index.ts

| From        | To         |
| ----------- | ---------- |
| `const _db` | `const db` |

### src/lib/db/messages.ts

| From     | To      |
| -------- | ------- |
| `_title` | `title` |

### src/lib/db/migrations/20250320_add_ai_performance_metrics.ts

| From           | To            |
| -------------- | ------------- |
| `(_model)`     | `(model)`     |
| `(_timestamp)` | `(timestamp)` |
| `(_success)`   | `(success)`   |

### src/lib/db/user-settings.ts

| From              | To               |
| ----------------- | ---------------- |
| `const _settings` | `const settings` |

### src/lib/logging/rotation.ts

| From                           | To                            |
| ------------------------------ | ----------------------------- |
| `const _execAsync`             | `const execAsync`             |
| `const _date`                  | `const date`                  |
| `const _startOfWeek`           | `const startOfWeek`           |
| `const _filename`              | `const filename`              |
| `const _stats`                 | `const stats`                 |
| `const _timestamp`             | `const timestamp`             |
| `const _rotatedFilename`       | `const rotatedFilename`       |
| `const _dirname`               | `const dirname`               |
| `const _baseFile`              | `const baseFile`              |
| `const _prefix`                | `const prefix`                |
| `const _files`                 | `const files`                 |
| `const _rotatedFiles`          | `const rotatedFiles`          |
| `const _filesWithStats`        | `const filesWithStats`        |
| `const _maxFiles`              | `const maxFiles`              |
| `const _filesToDelete`         | `const filesToDelete`         |
| `const _logDir`                | `const logDir`                |
| `const _dateMatch`             | `const dateMatch`             |
| `const _fileDate`              | `const fileDate`              |
| `const _filePath`              | `const filePath`              |
| `const _content`               | `const content`               |
| `_default`                     | `default`                     |
| `_filename`                    | `filename`                    |
| `_prefix`                      | `prefix`                      |
| `class _LogRotationService`    | `class LogRotationService`    |
| `interface _LogRotationConfig` | `interface LogRotationConfig` |
| `_config:`                     | `config:`                     |
| `_entry:`                      | `entry:`                      |
| `_baseFilename:`               | `baseFilename:`               |
| `_path:`                       | `path:`                       |
| `_mtime:`                      | `mtime:`                      |

### src/lib/middleware/index.ts

| From               | To                |
| ------------------ | ----------------- |
| `const _onRequest` | `const onRequest` |

### src/lib/security/index.ts

| From            | To             |
| --------------- | -------------- |
| `const _logger` | `const logger` |

### src/lib/security/monitoring.ts

| From                                  | To                                   |
| ------------------------------------- | ------------------------------------ |
| `const _logger`                       | `const logger`                       |
| `const _securityEventSchema`          | `const securityEventSchema`          |
| `const _validatedEvent`               | `const validatedEvent`               |
| `const _key`                          | `const key`                          |
| `const _now`                          | `const now`                          |
| `const _record`                       | `const record`                       |
| `const _lockTime`                     | `const lockTime`                     |
| `const _elapsedSeconds`               | `const elapsedSeconds`               |
| `_message`                            | `message`                            |
| `_config`                             | `config`                             |
| `class _SecurityMonitoringError`      | `class SecurityMonitoringError`      |
| `class _DatabaseError`                | `class DatabaseError`                |
| `class _SecurityMonitoringService`    | `class SecurityMonitoringService`    |
| `interface _SecurityEvent`            | `interface SecurityEvent`            |
| `interface _SecurityMonitoringConfig` | `interface SecurityMonitoringConfig` |
| `_event:`                             | `event:`                             |
| `_firstAttempt:`                      | `firstAttempt:`                      |
| `_userId:`                            | `userId:`                            |
| `_IP:`                                | `IP:`                                |
| `_Metadata:`                          | `Metadata:`                          |
| `_row:`                               | `row:`                               |

### src/lib/startup.ts

| From                 | To                  |
| -------------------- | ------------------- |
| `const _logger`      | `const logger`      |
| `const _logRotation` | `const logRotation` |
| `_logger`            | `logger`            |

### src/lib/types/supabase.ts

| From        | To         |
| ----------- | ---------- |
| `_Database` | `Database` |

### src/lib/utils.ts

| From               | To                |
| ------------------ | ----------------- |
| `const _date`      | `const date`      |
| `const _weekStart` | `const weekStart` |

### src/lib/zk/types.ts

| From                            | To                             |
| ------------------------------- | ------------------------------ |
| `_SessionData`                  | `SessionData`                  |
| `interface _ProofData`          | `interface ProofData`          |
| `interface _ZKSystemOptions`    | `interface ZKSystemOptions`    |
| `interface _ProofInput`         | `interface ProofInput`         |
| `interface _VerificationResult` | `interface VerificationResult` |
| `interface _CircuitOptions`     | `interface CircuitOptions`     |

### src/pages/admin/ai/high-risk-crises.astro

| From                         | To                          |
| ---------------------------- | --------------------------- |
| `const _checkPermission`     | `const checkPermission`     |
| `const _permissionResponse`  | `const permissionResponse`  |
| `const _user`                | `const user`                |
| `const _offset`              | `const offset`              |
| `const _response`            | `const response`            |
| `const _data`                | `const data`                |
| `const _date`                | `const date`                |
| `const _detections`          | `const detections`          |
| `const _tableBody`           | `const tableBody`           |
| `const _row`                 | `const row`                 |
| `const _riskClass`           | `const riskClass`           |
| `const _index`               | `const index`               |
| `const _pageInfo`            | `const pageInfo`            |
| `const _prevButton`          | `const prevButton`          |
| `const _nextButton`          | `const nextButton`          |
| `const _totalPages`          | `const totalPages`          |
| `const _detection`           | `const detection`           |
| `const _detailDate`          | `const detailDate`          |
| `const _detailUser`          | `const detailUser`          |
| `const _detailRisk`          | `const detailRisk`          |
| `const _detailType`          | `const detailType`          |
| `const _detailConfidence`    | `const detailConfidence`    |
| `const _detailModel`         | `const detailModel`         |
| `const _detailText`          | `const detailText`          |
| `const _modal`               | `const modal`               |
| `const _refreshBtn`          | `const refreshBtn`          |
| `const _closeBtn`            | `const closeBtn`            |
| `const _markReviewedBtn`     | `const markReviewedBtn`     |
| `const _escalateBtn`         | `const escalateBtn`         |
| `_text`                      | `text`                      |
| `_index`                     | `index`                     |
| `_detection`                 | `detection`                 |
| `interface _CrisisDetection` | `interface CrisisDetection` |
| `_dateString:`               | `dateString:`               |
| `_riskLevel:`                | `riskLevel:`                |

### src/pages/admin/ai/model-performance.astro

| From                           | To                            |
| ------------------------------ | ----------------------------- |
| `const _checkPermission`       | `const checkPermission`       |
| `const _permissionResponse`    | `const permissionResponse`    |
| `const _user`                  | `const user`                  |
| `const _tabButtons`            | `const tabButtons`            |
| `const _tabContents`           | `const tabContents`           |
| `const _tabId`                 | `const tabId`                 |
| `const _tabElement`            | `const tabElement`            |
| `const _refreshBtn`            | `const refreshBtn`            |
| `const _responseTimeElement`   | `const responseTimeElement`   |
| `const _tokenUsageElement`     | `const tokenUsageElement`     |
| `const _successRateElement`    | `const successRateElement`    |
| `const _costEfficiencyElement` | `const costEfficiencyElement` |

### src/pages/admin/ai/performance.astro

| From              | To               |
| ----------------- | ---------------- |
| `const _response` | `const response` |

### src/pages/admin/ai/usage.astro

| From                        | To                         |
| --------------------------- | -------------------------- |
| `const _checkPermission`    | `const checkPermission`    |
| `const _permissionResponse` | `const permissionResponse` |
| `const _user`               | `const user`               |
| `const _period`             | `const period`             |
| `const _urlParams`          | `const urlParams`          |
| `const _response`           | `const response`           |
| `const _data`               | `const data`               |
| `const _element`            | `const element`            |
| `const _canvas`             | `const canvas`             |
| `const _ctx`                | `const ctx`                |
| `const _colors`             | `const colors`             |
| `const _hue`                | `const hue`                |
| `const _label`              | `const label`              |
| `const _value`              | `const value`              |
| `const _percentage`         | `const percentage`         |
| `const _stats`              | `const stats`              |
| `const _totalRequestsEl`    | `const totalRequestsEl`    |
| `const _totalTokensEl`      | `const totalTokensEl`      |
| `const _totalCostEl`        | `const totalCostEl`        |
| `const _usageTableEl`       | `const usageTableEl`       |
| `const _totalRequests`      | `const totalRequests`      |
| `const _totalTokens`        | `const totalTokens`        |
| `const _totalCost`          | `const totalCost`          |
| `const _dates`              | `const dates`              |
| `const _date`               | `const date`               |
| `const _requestData`        | `const requestData`        |
| `const _tokenData`          | `const tokenData`          |
| `const _costData`           | `const costData`           |
| `const _models`             | `const models`             |
| `const _modelData`          | `const modelData`          |
| `const _tableBody`          | `const tableBody`          |
| `const _row`                | `const row`                |
| `const _formattedDate`      | `const formattedDate`      |
| `const _modelNames`         | `const modelNames`         |
| `_config`                   | `config`                   |
| `_index`                    | `index`                    |
| `_data`                     | `data`                     |
| `_ctx`                      | `ctx`                      |
| `_label`                    | `label`                    |
| `_models`                   | `models`                   |
| `class _Chart`              | `class Chart`              |
| `interface _ModelUsage`     | `interface ModelUsage`     |
| `interface _DailyStats`     | `interface DailyStats`     |
| `_num:`                     | `num:`                     |
| `_amount:`                  | `amount:`                  |
| `_elementId:`               | `elementId:`               |
| `_labels:`                  | `labels:`                  |
| `_color:`                   | `color:`                   |
| `_context:`                 | `context:`                 |
| `_sum:`                     | `sum:`                     |
| `_day:`                     | `day:`                     |

### src/pages/admin/ai-performance.astro

| From                        | To                         |
| --------------------------- | -------------------------- |
| `const _performanceMetrics` | `const performanceMetrics` |

### src/pages/admin/index.astro

| From                        | To                         |
| --------------------------- | -------------------------- |
| `const _checkPermission`    | `const checkPermission`    |
| `const _permissionResponse` | `const permissionResponse` |
| `const _user`               | `const user`               |

### src/pages/admin/zk-dashboard.astro

| From              | To               |
| ----------------- | ---------------- |
| `const _response` | `const response` |
| `const _zkStats`  | `const zkStats`  |

### src/pages/api/ai/models.ts

| From                | To                 |
| ------------------- | ------------------ |
| `const _session`    | `const session`    |
| `const _provider`   | `const provider`   |
| `const _capability` | `const capability` |
| `_error`            | `error`            |

### src/pages/api/ai/performance-metrics.ts

| From         | To          |
| ------------ | ----------- |
| `_timestamp` | `timestamp` |

### src/pages/api/ai/response.ts

| From     | To      |
| -------- | ------- |
| `_model` | `model` |

### src/pages/api/contact.ts

| From                    | To                     |
| ----------------------- | ---------------------- |
| `const _data`           | `const data`           |
| `const _requiredFields` | `const requiredFields` |

### src/pages/api/health.ts

| From                     | To                      |
| ------------------------ | ----------------------- |
| `const _supabaseUrl`     | `const supabaseUrl`     |
| `const _supabaseAnonKey` | `const supabaseAnonKey` |
| `const _supabase`        | `const supabase`        |
| `const _memoryUsage`     | `const memoryUsage`     |
| `_supabase`              | `supabase`              |
| `_supabaseAnonKey`       | `supabaseAnonKey`       |
| `_memoryUsage`           | `memoryUsage`           |

### src/pages/api/security/events.ts

| From                        | To                         |
| --------------------------- | -------------------------- |
| `const _logger`             | `const logger`             |
| `const _user`               | `const user`               |
| `const _url`                | `const url`                |
| `const _type`               | `const type`               |
| `const _severity`           | `const severity`           |
| `const _timeRange`          | `const timeRange`          |
| `const _limit`              | `const limit`              |
| `const _page`               | `const page`               |
| `const _queryParts`         | `const queryParts`         |
| `const _queryParams`        | `const queryParams`        |
| `const _now`                | `const now`                |
| `const _events`             | `const events`             |
| `interface _RequestContext` | `interface RequestContext` |

### src/pages/app.astro

| From            | To             |
| --------------- | -------------- |
| `const _logger` | `const logger` |

### src/pages/blog/[...slug].astro

| From                     | To                      |
| ------------------------ | ----------------------- |
| `const _prerender`       | `const prerender`       |
| `const _blogEntries`     | `const blogEntries`     |
| `const _safeFiles`       | `const safeFiles`       |
| `const _filteredEntries` | `const filteredEntries` |

### src/pages/blog/[series].astro

| From                  | To                   |
| --------------------- | -------------------- |
| `const _prerender`    | `const prerender`    |
| `const _allBlogPosts` | `const allBlogPosts` |
| `const _allSeries`    | `const allSeries`    |
| `const _posts`        | `const posts`        |
| `const _firstPost`    | `const firstPost`    |

### src/pages/blog/index.astro

| From                    | To                     |
| ----------------------- | ---------------------- |
| `const _allBlogPosts`   | `const allBlogPosts`   |
| `const _sortedPosts`    | `const sortedPosts`    |
| `const _featuredPost`   | `const featuredPost`   |
| `const _remainingPosts` | `const remainingPosts` |
| `const _seriesSet`      | `const seriesSet`      |
| `const _allSeries`      | `const allSeries`      |
| `const _tagSet`         | `const tagSet`         |
| `const _allTags`        | `const allTags`        |
| `const _formatDate`     | `const formatDate`     |
| `const _date`           | `const date`           |
| `const _seriesPosts`    | `const seriesPosts`    |
| `const _seriesSlug`     | `const seriesSlug`     |
| `_dateString`           | `dateString`           |

### src/pages/blog/tag/[tag].astro

| From                  | To                   |
| --------------------- | -------------------- |
| `const _prerender`    | `const prerender`    |
| `const _allBlogPosts` | `const allBlogPosts` |
| `const _allTags`      | `const allTags`      |
| `const _posts`        | `const posts`        |

### src/pages/contact.astro

| From          | To           |
| ------------- | ------------ |
| `const _form` | `const form` |

### src/pages/dev/accessibility-test.astro

| From                      | To                       |
| ------------------------- | ------------------------ |
| `const _announceBtn`      | `const announceBtn`      |
| `const _announcementArea` | `const announcementArea` |

### src/pages/dev/browser-compatibility-test.astro

| From                     | To                      |
| ------------------------ | ----------------------- |
| `const _form`            | `const form`            |
| `const _issuesContainer` | `const issuesContainer` |
| `const _loadIssues`      | `const loadIssues`      |
| `const _issues`          | `const issues`          |
| `const _issueElement`    | `const issueElement`    |
| `const _target`          | `const target`          |
| `const _index`           | `const index`           |
| `const _formData`        | `const formData`        |
| `const _issue`           | `const issue`           |
| `const _browserInput`    | `const browserInput`    |
| `const _ua`              | `const ua`              |
| `_e`                     | `e`                     |
| `_index`                 | `index`                 |
| `_form`                  | `form`                  |
| `_issues`                | `issues`                |
| `_issueElement`          | `issueElement`          |
| `_issue`                 | `issue`                 |
| `_browserInput`          | `browserInput`          |
| `(_Tab,`                 | `(Tab,`                 |

### src/pages/login.astro

| From          | To           |
| ------------- | ------------ |
| `const _form` | `const form` |

### src/pages/register.astro

| From           | To            |
| -------------- | ------------- |
| `const _error` | `const error` |

### src/pages/settings/ai-preferences.astro

| From                                     | To                                      |
| ---------------------------------------- | --------------------------------------- |
| `const _authResponse`                    | `const authResponse`                    |
| `const _user`                            | `const user`                            |
| `const _defaultPreferences`              | `const defaultPreferences`              |
| `const _form`                            | `const form`                            |
| `const _resetButton`                     | `const resetButton`                     |
| `const _enableCrisisDetection`           | `const enableCrisisDetection`           |
| `const _crisisDetectionSensitivityGroup` | `const crisisDetectionSensitivityGroup` |
| `const _formData`                        | `const formData`                        |
| `const _preferences`                     | `const preferences`                     |
| `const _notification`                    | `const notification`                    |
| `_message`                               | `message`                               |
| `(_Balanced)`                            | `(Balanced)`                            |
| `(_Faster)`                              | `(Faster)`                              |
| `(_Detailed)`                            | `(Detailed)`                            |
| `(_Fast)`                                | `(Fast)`                                |

### src/pages/signin.astro

| From                | To                 |
| ------------------- | ------------------ |
| `const _registered` | `const registered` |
| `const _signedOut`  | `const signedOut`  |
| `const _error`      | `const error`      |

### src/scripts/rotateKeys.ts

| From                   | To                    |
| ---------------------- | --------------------- |
| `const _args`          | `const args`          |
| `const _forceRotation` | `const forceRotation` |
| `const _purposeArg`    | `const purposeArg`    |
| `const _purpose`       | `const purpose`       |
| `const _timestamp`     | `const timestamp`     |
| `const _logMessage`    | `const logMessage`    |
| `const _crypto`        | `const crypto`        |
| `const _keys`          | `const keys`          |
| `const _keyData`       | `const keyData`       |
| `const _rotatedKey`    | `const rotatedKey`    |
| `const _rotatedKeys`   | `const rotatedKeys`   |
| `_message`             | `message`             |

### src/scripts/security-tests.ts

| From                     | To                      |
| ------------------------ | ----------------------- |
| `const _result`          | `const result`          |
| `const _totalTests`      | `const totalTests`      |
| `const _passedTests`     | `const passedTests`     |
| `const _failedTests`     | `const failedTests`     |
| `const _html`            | `const html`            |
| `const _reportPath`      | `const reportPath`      |
| `const _startTime`       | `const startTime`       |
| `const _endpointResults` | `const endpointResults` |
| `const _authStartTime`   | `const authStartTime`   |
| `const _authResults`     | `const authResults`     |
| `const _webStartTime`    | `const webStartTime`    |
| `const _webResults`      | `const webResults`      |
| `const _criticalIssues`  | `const criticalIssues`  |
| `const _allPassed`       | `const allPassed`       |
| `_result`                | `result`                |
| `_html`                  | `html`                  |
| `_reportPath`            | `reportPath`            |
| `_endpointResults`       | `endpointResults`       |
| `_authResults`           | `authResults`           |
| `_webResults`            | `webResults`            |
| `interface _TestResult`  | `interface TestResult`  |
| `interface _TestSuite`   | `interface TestSuite`   |
| `_suites:`               | `suites:`               |

### src/scripts/ts-error-docs.md

| From          | To           |
| ------------- | ------------ |
| `const _user` | `const user` |
| `_user`       | `user`       |

### src/scripts/verify-deployment.ts

| From                             | To                              |
| -------------------------------- | ------------------------------- |
| `const _requiredEnvVars`         | `const requiredEnvVars`         |
| `const _healthResponse`          | `const healthResponse`          |
| `const _dbCheck`                 | `const dbCheck`                 |
| `const _redisCheck`              | `const redisCheck`              |
| `const _endpoints`               | `const endpoints`               |
| `const _response`                | `const response`                |
| `_response`                      | `response`                      |
| `_requiredEnvVars`               | `requiredEnvVars`               |
| `_healthResponse`                | `healthResponse`                |
| `_redisCheck`                    | `redisCheck`                    |
| `_endpoints`                     | `endpoints`                     |
| `interface _HealthCheckResponse` | `interface HealthCheckResponse` |

### src/services/AIService.ts

| From               | To                |
| ------------------ | ----------------- |
| `class _AIService` | `class AIService` |
| `_requests:`       | `requests:`       |
| `_avgTime:`        | `avgTime:`        |
| `_tokens:`         | `tokens:`         |

### src/tests/ai/intervention-analysis.test.ts

| From                         | To                          |
| ---------------------------- | --------------------------- |
| `const _mockAIService`       | `const mockAIService`       |
| `const _result`              | `const result`              |
| `const _interventionMessage` | `const interventionMessage` |
| `const _userResponse`        | `const userResponse`        |
| `const _interventions`       | `const interventions`       |
| `const _results`             | `const results`             |
| `const _service`             | `const service`             |
| `const _customPrompt`        | `const customPrompt`        |
| `_name`                      | `name`                      |
| `_content`                   | `content`                   |

### src/tests/browser-compatibility.test.ts

| From                           | To                            |
| ------------------------------ | ----------------------------- |
| `const _BROWSERS`              | `const BROWSERS`              |
| `const _FEATURES`              | `const FEATURES`              |
| `const _isSupported`           | `const isSupported`           |
| `const _visualIssues`          | `const visualIssues`          |
| `const _screenshotDir`         | `const screenshotDir`         |
| `const _criticalElements`      | `const criticalElements`      |
| `const _interactionResults`    | `const interactionResults`    |
| `const _jsErrors`              | `const jsErrors`              |
| `const _viewportAdaption`      | `const viewportAdaption`      |
| `const _viewport`              | `const viewport`              |
| `const _viewportMeta`          | `const viewportMeta`          |
| `const _hasViewportMeta`       | `const hasViewportMeta`       |
| `const _docWidth`              | `const docWidth`              |
| `const _windowWidth`           | `const windowWidth`           |
| `const _hasHorizontalOverflow` | `const hasHorizontalOverflow` |
| `const _tooSmallTapTargets`    | `const tooSmallTapTargets`    |
| `const _rect`                  | `const rect`                  |
| `const _mobileScreenshotDir`   | `const mobileScreenshotDir`   |
| `const _touchInputResults`     | `const touchInputResults`     |
| `const _resultsDir`            | `const resultsDir`            |
| `const _elements`              | `const elements`              |
| `const _elementsWithPosition`  | `const elementsWithPosition`  |
| `const _style`                 | `const style`                 |
| `const _rect1`                 | `const rect1`                 |
| `const _rect2`                 | `const rect2`                 |
| `const _overlap`               | `const overlap`               |
| `const _textElements`          | `const textElements`          |
| `const _walk`                  | `const walk`                  |
| `const _el`                    | `const el`                    |
| `const _backgroundColor`       | `const backgroundColor`       |
| `const _color`                 | `const color`                 |
| `const _isMobile`              | `const isMobile`              |
| `const _path`                  | `const path`                  |
| `const _navLinks`              | `const navLinks`              |
| `const _randomIndex`           | `const randomIndex`           |
| `const _inputs`                | `const inputs`                |
| `const _buttons`               | `const buttons`               |
| `const _touchTargets`          | `const touchTargets`          |
| `const _mobileMenuButton`      | `const mobileMenuButton`      |
| `const _menuVisible`           | `const menuVisible`           |
| `const _possibleMenus`         | `const possibleMenus`         |
| `const _event`                 | `const event`                 |
| `_error`                       | `error`                       |
| `_name`                        | `name`                        |
| `_options`                     | `options`                     |
| `_config`                      | `config`                      |
| `_page`                        | `page`                        |
| `_event`                       | `event`                       |
| `_color`                       | `color`                       |
| `_visualIssues`                | `visualIssues`                |
| `_screenshotDir`               | `screenshotDir`               |
| `_criticalElements`            | `criticalElements`            |
| `_interactionResults`          | `interactionResults`          |
| `_jsErrors`                    | `jsErrors`                    |
| `_viewport`                    | `viewport`                    |
| `_windowWidth`                 | `windowWidth`                 |
| `_rect`                        | `rect`                        |
| `_mobileScreenshotDir`         | `mobileScreenshotDir`         |
| `_touchInputResults`           | `touchInputResults`           |
| `_resultsDir`                  | `resultsDir`                  |
| `_elements`                    | `elements`                    |
| `_style`                       | `style`                       |
| `_rect2`                       | `rect2`                       |
| `_textElements`                | `textElements`                |
| `_walk`                        | `walk`                        |
| `_el`                          | `el`                          |
| `_isMobile`                    | `isMobile`                    |
| `_navLinks`                    | `navLinks`                    |
| `_randomIndex`                 | `randomIndex`                 |
| `_engine:`                     | `engine:`                     |
| `_test:`                       | `test:`                       |
| `_testCode:`                   | `testCode:`                   |
| `_details:`                    | `details:`                    |
| `_msg:`                        | `msg:`                        |
| `_err:`                        | `err:`                        |

### src/tests/crypto.test.ts

| From    | To     |
| ------- | ------ |
| `_data` | `data` |

### src/tests/performance.test.ts

| From                           | To                            |
| ------------------------------ | ----------------------------- |
| `const _resultsDir`            | `const resultsDir`            |
| `const _startTime`             | `const startTime`             |
| `const _navigationTime`        | `const navigationTime`        |
| `const _metrics`               | `const metrics`               |
| `const _perfEntries`           | `const perfEntries`           |
| `const _paintEntries`          | `const paintEntries`          |
| `const _lcpEntry`              | `const lcpEntry`              |
| `const _resources`             | `const resources`             |
| `const _resourceCount`         | `const resourceCount`         |
| `const _resourceSize`          | `const resourceSize`          |
| `const _cumulativeLayoutShift` | `const cumulativeLayoutShift` |
| `const _jsCoverage`            | `const jsCoverage`            |
| `const _jsSize`                | `const jsSize`                |
| `const _jsExecutionTime`       | `const jsExecutionTime`       |
| `const _functions`             | `const functions`             |
| `const _button`                | `const button`                |
| `const _inputDelayPromise`     | `const inputDelayPromise`     |
| `const _handlePointerDown`     | `const handlePointerDown`     |
| `const _handlePointerUp`       | `const handlePointerUp`       |
| `const _endTime`               | `const endTime`               |
| `const _inputDelay`            | `const inputDelay`            |
| `const _response`              | `const response`              |
| `const _files`                 | `const files`                 |
| `const _jsonFiles`             | `const jsonFiles`             |
| `const _previousResults`       | `const previousResults`       |
| `const _previousPageMetrics`   | `const previousPageMetrics`   |
| `const _current`               | `const current`               |
| `const _previous`              | `const previous`              |
| `const _percentChange`         | `const percentChange`         |
| `const _input`                 | `const input`                 |
| `_name`                        | `name`                        |
| `_content`                     | `content`                     |
| `_ms`                          | `ms`                          |
| `_entry`                       | `entry`                       |
| `_url`                         | `url`                         |
| `_page`                        | `page`                        |
| `_response`                    | `response`                    |
| `_startTime`                   | `startTime`                   |
| `_resultsDir`                  | `resultsDir`                  |
| `_resources`                   | `resources`                   |
| `_jsCoverage`                  | `jsCoverage`                  |
| `_functions`                   | `functions`                   |
| `_button`                      | `button`                      |
| `_endTime`                     | `endTime`                     |
| `_inputDelay`                  | `inputDelay`                  |
| `_previousResults`             | `previousResults`             |
| `_previous`                    | `previous`                    |
| `_percentChange`               | `percentChange`               |
| `_input`                       | `input`                       |
| `_method:`                     | `method:`                     |
| `_total:`                      | `total:`                      |
| `_a:`                          | `a:`                          |

### src/utils/accessibilityPolyfills.ts

| From                               | To                                |
| ---------------------------------- | --------------------------------- |
| `let _hadKeyboardEvent`            | `let hadKeyboardEvent`            |
| `const _keyboardThrottleTimeoutId` | `const keyboardThrottleTimeoutId` |
| `_e`                               | `e`                               |
| `function _onKeyDown`              | `function onKeyDown`              |
| `function _onPointerDown`          | `function onPointerDown`          |
| `function _onFocus`                | `function onFocus`                |
| `function _onBlur`                 | `function onBlur`                 |
| `_hadKeyboardEvent`                | `hadKeyboardEvent`                |

### src/utils/browserTesting.ts

| From                      | To                       |
| ------------------------- | ------------------------ |
| `const _userAgent`        | `const userAgent`        |
| `const _supportsAriaLive` | `const supportsAriaLive` |
| `const _testContainer`    | `const testContainer`    |
| `const _button1`          | `const button1`          |
| `const _button2`          | `const button2`          |
| `const _button1HasFocus`  | `const button1HasFocus`  |
| `const _button2HasFocus`  | `const button2HasFocus`  |
| `const _browserInfo`      | `const browserInfo`      |
| `const _ariaLiveTest`     | `const ariaLiveTest`     |
| `const _focusTest`        | `const focusTest`        |
| `_userAgent`              | `userAgent`              |
| `_testContainer`          | `testContainer`          |
| `_button1`                | `button1`                |
| `_button2`                | `button2`                |
| `interface _BrowserInfo`  | `interface BrowserInfo`  |
| `(_resolve)`              | `(resolve)`              |

### src/utils/date.ts

| From                | To                 |
| ------------------- | ------------------ |
| `const _date`       | `const date`       |
| `const _now`        | `const now`        |
| `const _diffInMs`   | `const diffInMs`   |
| `const _diffInDays` | `const diffInDays` |
| `const _weeks`      | `const weeks`      |
| `const _months`     | `const months`     |
| `const _years`      | `const years`      |
| `_dateString`       | `dateString`       |
| `_date`             | `date`             |
| `_now`              | `now`              |
| `_weeks`            | `weeks`            |
| `_months`           | `months`           |
| `_years`            | `years`            |

### src/utils/formatDate.ts

| From          | To           |
| ------------- | ------------ |
| `const _date` | `const date` |
| `_dateString` | `dateString` |
| `_date`       | `date`       |

### src/utils/performance-optimization.ts

| From                       | To                        |
| -------------------------- | ------------------------- |
| `const _entryTypes`        | `const entryTypes`        |
| `const _observer`          | `const observer`          |
| `const _entries`           | `const entries`           |
| `const _lastEntry`         | `const lastEntry`         |
| `const _lcp`               | `const lcp`               |
| `const _lcpElement`        | `const lcpElement`        |
| `const _lcpSize`           | `const lcpSize`           |
| `const _value`             | `const value`             |
| `const _firstEntry`        | `const firstEntry`        |
| `const _fid`               | `const fid`               |
| `const _fcp`               | `const fcp`               |
| `const _navigationEntries` | `const navigationEntries` |
| `const _ttfb`              | `const ttfb`              |
| `const _link`              | `const link`              |
| `const _lcpImages`         | `const lcpImages`         |
| `const _scripts`           | `const scripts`           |
| `const _images`            | `const images`            |
| `const _iframes`           | `const iframes`           |
| `const _elements`          | `const elements`          |
| `const _cleanupElements`   | `const cleanupElements`   |
| `const _clone`             | `const clone`             |
| `_error`                   | `error`                   |
| `_true`                    | `true`                    |
| `_resources`               | `resources`               |
| `_link`                    | `link`                    |
| `_entry`                   | `entry`                   |
| `_value`                   | `value`                   |
| `_elements`                | `elements`                |
| `_entries`                 | `entries`                 |
| `_lastEntry`               | `lastEntry`               |
| `_lcp`                     | `lcp`                     |
| `_lcpSize`                 | `lcpSize`                 |
| `_firstEntry`              | `firstEntry`              |
| `_fid`                     | `fid`                     |
| `_fcp`                     | `fcp`                     |
| `_navigationEntries`       | `navigationEntries`       |
| `_ttfb`                    | `ttfb`                    |
| `_lcpImages`               | `lcpImages`               |
| `_scripts`                 | `scripts`                 |
| `_images`                  | `images`                  |
| `_iframes`                 | `iframes`                 |
| `_clone`                   | `clone`                   |
| `_buffered:`               | `buffered:`               |
| `_cls:`                    | `cls:`                    |
| `(_LCP)`                   | `(LCP)`                   |
| `(_entryList)`             | `(entryList)`             |
| `(_CLS)`                   | `(CLS)`                   |
| `(_clsValue)`              | `(clsValue)`              |
| `(_FID)`                   | `(FID)`                   |
| `(_FCP)`                   | `(FCP)`                   |
| `(_TTFB)`                  | `(TTFB)`                  |
| `(_selector)`              | `(selector)`              |
| `(_selector,`              | `(selector,`              |
| `_entryList`               | `entryList`               |
| `_selector`                | `selector`                |

### src/utils/template.ts

| From                  | To                   |
| --------------------- | -------------------- |
| `const _templatePath` | `const templatePath` |
| `const _arrayRegex`   | `const arrayRegex`   |
| `const _match`        | `const match`        |
| `const _itemTemplate` | `const itemTemplate` |
| `const _files`        | `const files`        |
| `_dirname`            | `dirname`            |
| `_files`              | `files`              |
| `_templatePath`       | `templatePath`       |
| `_match`              | `match`              |
| `_item:`              | `item:`              |

### tests/security/security-reports/ai-security-report-2025-03-17.html

| From    | To     |
| ------- | ------ |
| `_link` | `link` |

## Skipped Files

No files skipped.

## Errors

No errors encountered.
