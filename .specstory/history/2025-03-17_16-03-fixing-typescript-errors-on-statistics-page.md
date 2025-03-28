<!-- Generated by SpecStory -->

# Fixing TypeScript Errors on Statistics Page (2025-03-17 12:03:26)

_**User**_

Clean up all the errors on this page

---

_**Assistant**_

I'll fix the TypeScript errors in the AI usage statistics page. The main issues are related to missing type definitions, potential null values, and the Chart.js integration.

---

```diff
  
  <script>
+   // Define types for usage statistics
+   interface ModelUsage {
+     requests: number;
+     tokens: number;
+     cost: number;
+   }
+ 
+   interface DailyStats {
+     date: string;
+     totalRequests: number;
+     totalTokens: number;
+     totalCost: number;
+     modelUsage: Record<string, ModelUsage>;
+   }
+ 
+   // Chart.js type declaration
+   declare class Chart {
+     constructor(ctx: CanvasRenderingContext2D, config: any);
+     destroy(): void;
+   }
+ 
    // Fetch AI usage statistics
-   async function fetchUsageStats() {
+   async function fetchUsageStats(): Promise<DailyStats[]> {
      try {
        const urlParams = new URLSearchParams(window.location.search);
  
    // Format numbers for display
-   function formatNumber(num) {
+   function formatNumber(num: number): string {
      return new Intl.NumberFormat().format(num);
    }
  
    // Format currency for display
-   function formatCurrency(amount) {
+   function formatCurrency(amount: number): string {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
  
    // Create a line chart
-   function createLineChart(elementId, labels, data, label, color) {
-     const ctx = document.querySelector(`#${elementId} .stat-chart`).getContext('2d');
+   function createLineChart(elementId: string, labels: string[], data: number[], label: string, color: string): Chart | null {
+     const element = document.querySelector(`#${elementId} .stat-chart`);
+     if (!element) return null;
+     
+     const canvas = element as HTMLCanvasElement;
+     const ctx = canvas.getContext('2d');
+     if (!ctx) return null;
      
      return new Chart(ctx, {
  
    // Create a pie chart for model usage
-   function createModelUsageChart(elementId, models, data) {
-     const ctx = document.querySelector(`#${elementId} .stat-chart-large`).getContext('2d');
+   function createModelUsageChart(elementId: string, models: string[], data: number[]): Chart | null {
+     const element = document.querySelector(`#${elementId} .stat-chart-large`);
+     if (!element) return null;
+     
+     const canvas = element as HTMLCanvasElement;
+     const ctx = canvas.getContext('2d');
+     if (!ctx) return null;
      
      // Generate colors for each model
-     const colors = models.map((_, index) => {
+     const colors = models.map((_: unknown, index: number) => {
        const hue = (index * 137) % 360; // Use golden ratio to spread colors
        return `hsl(${hue}, 70%, 60%)`;
            tooltip: {
              callbacks: {
-               label: function(context) {
+               label: function(context: any) {
                  const label = context.label || '';
                  const value = context.raw;
  
    // Update the UI with the fetched data
-   async function updateUI() {
+   async function updateUI(): Promise<void> {
      const stats = await fetchUsageStats();
      
      if (!stats || stats.length === 0) {
-       document.querySelector('#total-requests .stat-value').textContent = 'No data';
-       document.querySelector('#total-tokens .stat-value').textContent = 'No data';
-       document.querySelector('#total-cost .stat-value').textContent = 'No data';
-       document.querySelector('#usage-table tbody').innerHTML = `
+       const totalRequestsEl = document.querySelector('#total-requests .stat-value');
+       const totalTokensEl = document.querySelector('#total-tokens .stat-value');
+       const totalCostEl = document.querySelector('#total-cost .stat-value');
+       const usageTableEl = document.querySelector('#usage-table tbody');
+       
+       if (totalRequestsEl) totalRequestsEl.textContent = 'No data';
+       if (totalTokensEl) totalTokensEl.textContent = 'No data';
+       if (totalCostEl) totalCostEl.textContent = 'No data';
+       if (usageTableEl) usageTableEl.innerHTML = `
          <tr>
            <td colspan="5" class="empty-row">No usage data available</td>
      
      // Calculate totals
-     const totalRequests = stats.reduce((sum, day) => sum + day.totalRequests, 0);
-     const totalTokens = stats.reduce((sum, day) => sum + day.totalTokens, 0);
-     const totalCost = stats.reduce((sum, day) => sum + day.totalCost, 0);
+     const totalRequests = stats.reduce((sum: number, day: DailyStats) => sum + day.totalRequests, 0);
+     const totalTokens = stats.reduce((sum: number, day: DailyStats) => sum + day.totalTokens, 0);
+     const totalCost = stats.reduce((sum: number, day: DailyStats) => sum + day.totalCost, 0);
      
      // Update summary cards
-     document.querySelector('#total-requests .stat-value').textContent = formatNumber(totalRequests);
-     document.querySelector('#total-tokens .stat-value').textContent = formatNumber(totalTokens);
-     document.querySelector('#total-cost .stat-value').textContent = formatCurrency(totalCost);
+     const totalRequestsEl = document.querySelector('#total-requests .stat-value');
+     const totalTokensEl = document.querySelector('#total-tokens .stat-value');
+     const totalCostEl = document.querySelector('#total-cost .stat-value');
+     
+     if (totalRequestsEl) totalRequestsEl.textContent = formatNumber(totalRequests);
+     if (totalTokensEl) totalTokensEl.textContent = formatNumber(totalTokens);
+     if (totalCostEl) totalCostEl.textContent = formatCurrency(totalCost);
      
      // Prepare data for charts
-     const dates = stats.map(day => {
+     const dates = stats.map((day: DailyStats) => {
        const date = new Date(day.date);
        return date.toLocaleDateString();
      }).reverse();
      
-     const requestData = stats.map(day => day.totalRequests).reverse();
-     const tokenData = stats.map(day => day.totalTokens).reverse();
-     const costData = stats.map(day => day.totalCost).reverse();
+     const requestData = stats.map((day: DailyStats) => day.totalRequests).reverse();
+     const tokenData = stats.map((day: DailyStats) => day.totalTokens).reverse();
+     const costData = stats.map((day: DailyStats) => day.totalCost).reverse();
      
      // Create charts
      
      // Prepare model usage data
-     const modelUsage = {};
-     stats.forEach(day => {
+     const modelUsage: Record<string, number> = {};
+     stats.forEach((day: DailyStats) => {
        Object.entries(day.modelUsage).forEach(([model, usage]) => {
          if (!modelUsage[model]) {
      // Update table
      const tableBody = document.querySelector('#usage-table tbody');
+     if (!tableBody) return;
+     
      tableBody.innerHTML = '';
      
-     stats.forEach(day => {
+     stats.forEach((day: DailyStats) => {
        const row = document.createElement('tr');
        
```

---

I've fixed all the TypeScript errors in the AI usage statistics page by:

1. Adding proper interfaces for the data structures:
   - `ModelUsage` interface for tracking model-specific metrics
   - `DailyStats` interface for daily statistics data

2. Adding type declarations for Chart.js to resolve the "Cannot find name 'Chart'" errors

3. Adding proper return types to all functions

4. Handling potential null values with null checks before accessing properties

5. Fixing DOM element access by:
   - Checking if elements exist before accessing their properties
   - Casting elements to the correct types (HTMLCanvasElement)
   - Properly handling getContext() calls

6. Adding proper type annotations to parameters in callbacks and arrow functions

7. Using Record<string, number> for the modelUsage object to fix index signature errors

These changes ensure type safety throughout the code while maintaining the original functionality of the AI usage statistics dashboard.

---



---

