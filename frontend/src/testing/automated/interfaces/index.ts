// Core interfaces for the automated testing system

export interface TestOrchestrator {
  startAutomatedTesting(): Promise<TestResults>;
  schedulePeriodicTesting(interval: number): void;
  stopTesting(): void;
  getTestStatus(): TestStatus;
  generateReport(): TestReport;
  executeTestSuite(): Promise<TestResults>;
  validateConfiguration(): Promise<boolean>;
  handleTestFailures(failures: TestFailure[]): Promise<void>;
}

export interface UINavigator {
  navigateToComponent(component: DashboardComponent): Promise<void>;
  clickButton(buttonSelector: string): Promise<void>;
  validateElementPresence(selector: string): Promise<boolean>;
  extractDataFromElement(selector: string): Promise<string>;
  simulateUserInput(input: UserInput): Promise<void>;
  waitForElement(selector: string, timeout?: number): Promise<void>;
  takeScreenshot(name: string): Promise<string>;
}

export interface DataValidator {
  validateBlockchainData(component: string, displayedData: any): Promise<ValidationResult>;
  validateAPIData(endpoint: string, displayedData: any): Promise<ValidationResult>;
  checkDataFreshness(timestamp: number): boolean;
  validateCalculations(metrics: FinancialMetrics): ValidationResult;
  validateAPYAccuracy(displayed: number, expected: number): ValidationResult;
  validateBalanceSync(address: string, displayedBalance: string): Promise<ValidationResult>;
}

export interface WorkflowSimulator {
  simulateDepositFlow(amount: number): Promise<WorkflowResult>;
  simulateWithdrawFlow(amount: number): Promise<WorkflowResult>;
  simulateStrategyAllocation(strategy: string): Promise<WorkflowResult>;
  simulateRebalancing(): Promise<WorkflowResult>;
  validateWorkflowIntegrity(workflow: UserWorkflow): Promise<ValidationResult>;
  executeUserJourney(journey: UserJourney): Promise<WorkflowResult>;
}

export interface PerformanceMonitor {
  measureResponseTime(action: string): Promise<number>;
  trackLoadingStates(): Promise<LoadingMetrics>;
  monitorMemoryUsage(): Promise<MemoryMetrics>;
  validatePerformanceThresholds(): Promise<PerformanceReport>;
  startPerformanceTracking(): void;
  stopPerformanceTracking(): PerformanceMetrics;
}

// Supporting types and interfaces
export interface TestResults {
  overallScore: number;
  componentResults: ComponentTestResult[];
  workflowResults: WorkflowTestResult[];
  performanceMetrics: PerformanceMetrics;
  dataValidationResults: DataValidationResult[];
  recommendations: Recommendation[];
  timestamp: Date;
  duration: number;
  passed: boolean;
}

export interface TestStatus {
  isRunning: boolean;
  currentTest: string | null;
  progress: number;
  startTime: Date | null;
  estimatedCompletion: Date | null;
}

export interface TestReport {
  summary: TestSummary;
  detailedResults: TestResults;
  qaScore: number;
  hackathonReadiness: HackathonReadinessScore;
  improvementSuggestions: ImprovementSuggestion[];
}

export interface DashboardComponent {
  name: string;
  selector: string;
  type: ComponentType;
  expectedElements: string[];
  interactions: ComponentInteraction[];
}

export interface UserInput {
  type: 'click' | 'type' | 'select' | 'hover';
  selector: string;
  value?: string;
  options?: Record<string, any>;
}

export interface ValidationResult {
  isValid: boolean;
  accuracy: number;
  discrepancies: Discrepancy[];
  lastUpdated: Date;
  source: DataSource;
  confidence: number;
}

export interface WorkflowResult {
  success: boolean;
  steps: WorkflowStep[];
  duration: number;
  errors: WorkflowError[];
  metrics: WorkflowMetrics;
}

export interface UserWorkflow {
  name: string;
  steps: WorkflowStep[];
  expectedOutcome: string;
  validationRules: ValidationRule[];
}

export interface ComponentTestResult {
  componentName: string;
  passed: boolean;
  issues: Issue[];
  performanceScore: number;
  dataAccuracy: number;
  interactionResults: InteractionResult[];
}

export interface WorkflowTestResult {
  workflowName: string;
  success: boolean;
  duration: number;
  stepResults: StepResult[];
  errors: WorkflowError[];
}

export interface PerformanceMetrics {
  responseTime: number;
  loadTime: number;
  memoryUsage: number;
  cpuUsage: number;
  networkRequests: NetworkMetric[];
}

export interface LoadingMetrics {
  initialLoad: number;
  componentLoad: Record<string, number>;
  dataFetch: Record<string, number>;
  totalLoadTime: number;
}

export interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

export interface PerformanceReport {
  overallScore: number;
  metrics: PerformanceMetrics;
  thresholdViolations: ThresholdViolation[];
  recommendations: PerformanceRecommendation[];
}

export interface DataValidationResult {
  component: string;
  dataType: string;
  validation: ValidationResult;
  timestamp: Date;
}

export interface Recommendation {
  type: RecommendationType;
  priority: Priority;
  description: string;
  actionItems: string[];
  impact: ImpactLevel;
}

export interface FinancialMetrics {
  apy: number;
  balance: string;
  vaultShares: string;
  performance: number;
  riskScore: number;
}

export interface UserJourney {
  name: string;
  description: string;
  steps: JourneyStep[];
  expectedDuration: number;
  successCriteria: string[];
}

export interface TestFailure {
  testName: string;
  component: string;
  error: Error;
  severity: Severity;
  timestamp: Date;
}

export interface Discrepancy {
  field: string;
  expected: any;
  actual: any;
  severity: Severity;
  impact: string;
}

export interface WorkflowStep {
  name: string;
  action: string;
  selector?: string;
  expectedResult: string;
  timeout: number;
}

export interface WorkflowError {
  step: string;
  error: string;
  severity: Severity;
  recoverable: boolean;
}

export interface WorkflowMetrics {
  totalTime: number;
  stepTimes: Record<string, number>;
  successRate: number;
  errorCount: number;
}

export interface ValidationRule {
  field: string;
  rule: string;
  expectedValue?: any;
  tolerance?: number;
}

export interface Issue {
  type: IssueType;
  severity: Severity;
  description: string;
  location: string;
  suggestion: string;
}

export interface InteractionResult {
  interaction: string;
  success: boolean;
  responseTime: number;
  error?: string;
}

export interface StepResult {
  stepName: string;
  success: boolean;
  duration: number;
  error?: string;
  data?: any;
}

export interface NetworkMetric {
  url: string;
  method: string;
  responseTime: number;
  status: number;
  size: number;
}

export interface ThresholdViolation {
  metric: string;
  threshold: number;
  actual: number;
  severity: Severity;
}

export interface PerformanceRecommendation {
  area: string;
  issue: string;
  suggestion: string;
  impact: ImpactLevel;
}

export interface TestSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

export interface HackathonReadinessScore {
  overall: number;
  presentation: number;
  functionality: number;
  dataAccuracy: number;
  userExperience: number;
  wowFactor: number;
}

export interface ImprovementSuggestion {
  category: string;
  priority: Priority;
  description: string;
  implementation: string;
  estimatedImpact: ImpactLevel;
}

export interface JourneyStep {
  name: string;
  description: string;
  action: UserAction;
  validation: StepValidation;
}

export interface ComponentInteraction {
  type: InteractionType;
  selector: string;
  expectedBehavior: string;
}

export interface UserAction {
  type: ActionType;
  target: string;
  value?: any;
  options?: Record<string, any>;
}

export interface StepValidation {
  checks: ValidationCheck[];
  timeout: number;
}

export interface ValidationCheck {
  type: CheckType;
  selector?: string;
  expectedValue?: any;
  tolerance?: number;
}

// Enums and type unions
export type ComponentType = 'panel' | 'chart' | 'button' | 'input' | 'display' | 'navigation';
export type DataSource = 'blockchain' | 'api' | 'cache' | 'calculation';
export type RecommendationType = 'performance' | 'ui' | 'data' | 'workflow' | 'accessibility';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type ImpactLevel = 'minimal' | 'moderate' | 'significant' | 'major';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type IssueType = 'ui' | 'data' | 'performance' | 'workflow' | 'accessibility';
export type InteractionType = 'click' | 'input' | 'hover' | 'scroll' | 'navigate';
export type ActionType = 'click' | 'type' | 'select' | 'wait' | 'navigate' | 'validate';
export type CheckType = 'presence' | 'value' | 'attribute' | 'style' | 'count';