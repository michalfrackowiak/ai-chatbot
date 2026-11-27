import { AIUsageLog, usageLimits } from '@/lib/db/schema';
import { getAIUsageLogByUserId, getUsageLimits, updateUsageLimits } from '@/lib/db/queries';
import { useState, useEffect } from 'react';

export function AdminPanel() {
  const [usageLogs, setUsageLogs] = useState<Array<{
    id: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    cost: number;
    date: Date;
  }>>([]);
  const [loading, setLoading] = useState(true);
  [totalCost, setTotalCost] = useState(0);
  [modelCounts, setModelCounts] = useState<Record<string, number>>({});
  [usageLimitsData, setUsageLimitsData] = useState<{
    monthlyLimit: string;
    weeklyLimit: string;
    hasSetLimits: boolean;
  }>({ monthlyLimit: '100', weeklyLimit: '25', hasSetLimits: false });
  [isSettingLimits, setIsSettingLimits] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const logs = await getAIUsageLogByUserId({ userId: 'current-user' });
        setUsageLogs(logs);
        
        // Calculate total cost
        const total = logs.reduce((sum, log) => sum + log.cost, 0);
        setTotalCost(total);
        
        // Count by model
        const counts: Record<string, number> = {};
        logs.forEach(log => {
          counts[log.model] = (counts[log.model] || 0) + 1;
        });
        setModelCounts(counts);
        
        // Get usage limits
        const limits = await getUsageLimits({ userId: 'current-user' });
        setUsageLimitsData({
          monthlyLimit: limits.monthlyLimit,
          weeklyLimit: limits.weeklyLimit,
          hasSetLimits: true,
        });
      } catch (error) {
        console.error('Failed to load admin data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleSetLimits = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSettingLimits(true);
    try {
      await updateUsageLimits({
        userId: 'current-user',
        monthlyLimit: usageLimitsData.monthlyLimit,
        weeklyLimit: usageLimitsData.weeklyLimit,
      });
      setUsageLimitsData({
        monthlyLimit: usageLimitsData.monthlyLimit,
        weeklyLimit: usageLimitsData.weeklyLimit,
        hasSetLimits: true,
      });
    } catch (error) {
      console.error('Failed to update usage limits:', error);
    } finally {
      setIsSettingLimits(false);
    }
  };

  const estimatedMonthlyCost = totalCost * 4; // Rough estimate: 4x the current rate
  const estimatedAnnualCost = totalCost * 52;

  return (
    <div className="rounded-md border border-border bg-card p-6">
      <h2 className="text-xl font-medium mb-6">AI Usage Analytics</h2>
      
      {loading ? (
        <p className="text-muted-foreground">Loading usage data...</p>
      ) : (
        <div className="space-y-6">
          {/* Cost Summary */}
          <div>
            <h3 className="text-semibold mb-4">Cost Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold ${totalCost > 10 ? 'text-red-600' : 'text-green-600'}">
                  ${totalCost.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Est. Monthly</p>
                <p className="text-2xl font-bold ${estimatedMonthlyCost > 50 ? 'text-red-600' : 'text-green-600'}">
                  ${estimatedMonthlyCost.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Est. Annual</p>
                <p className="text-2xl font-bold ${estimatedAnnualCost > 500 ? 'text-red-600' : 'text-green-600'}">
                  ${estimatedAnnualCost.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Model Usage Chart */}
          <div>
            <h3 className="text-semibold mb-4">Usage by Model</h3>
            <div className="space-y-2">
              {Object.entries(modelCounts).map(([model, count]) => (
                <div key={model} className="flex justify-between items-center text-sm">
                  <span>{model}</span>
                  <span>{count} sessions</span>
                  <div 
                    className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden"
                    style={{ 
                      height: '2px', 
                      background: 'currentColor',
                      marginLeft: '8px'
                    }}
                  >
                    <div 
                      className="h-full bg-primary rounded-full"
                      style={{ 
                        width: `${Math.min((count / Math.max(...Object.values(modelCounts)) || 1, 1) * 100}%`,

                        height: '2px'
                      }}
                    /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Usage Log Table */}
          <div>
            <h3 className="text-semibold mb-4">Usage Log</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-full rounded-md border border-border">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-3 text-left text-xs font-medium uppercase text-muted-foreground">Model</th>
                    <th className="p-3 text-left text-xs font-medium uppercase text-muted-foreground">Prompt Tokens</th>
                    <th className="p-3 text-left text-xs font-medium uppercase text-muted-foreground">Completion Tokens</th>
                    <th className="p-3 text-left text-xs font-medium uppercase text-muted-foreground">Cost</th>
                    <th className="p-3 text-left text-xs font-medium uppercase text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {usageLogs.map((log) => (
                    <tr key={log.id} className="border-b border-border">
                      <td className="p-3">{log.model}</td>
                      <td className="p-3">{log.promptTokens}</td>
                      <td className="p-3">{log.completionTokens}</td>
                      <td className="p-3 font-medium">${log.cost.toFixed(4)}</td>
                      <td className="p-3 text-sm text-muted-foreground">{log.date.toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Usage Limits Form */}
      {usageLimitsData.hasSetLimits && (
        <div mt-8>
          <h3 className="text-semibold mb-4">Set Usage Limits</h3>
          <p className="text-muted-foreground">
            Configure monthly and weekly spending limits to avoid surprise costs.
          </p>
          
          <form onSubmit={handleSetLimits} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Monthly Limit (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={usageLimitsData.monthlyLimit}
                onChange={(e) => 
                  setUsageLimitsData(prev => ({ ...prev, monthlyLimit: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., 50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Weekly Limit (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={usageLimitsData.weeklyLimit}
                onChange={(e) => 
                  setUsageLimitsData(prev => ({ ...prev, weeklyLimit: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., 20"
              />
            </div>
            <button
              type="submit"
              disabled={isSettingLimits}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSettingLimits ? 'Setting...' : 'Set Limits'}
            </button>
          </form>
          
          <div className="mt-4 p-3 bg-green-50 rounded-md">
            <p className="text-sm text-green-800">
              Your limits are now set at ${usageLimitsData.monthlyLimit}/month and 
              ${usageLimitsData.weeklyLimit}/week. You'll be notified when approaching these limits.
            </p>
          </div>
        </div>
      )}

      {/* Cost Warning */}
      {!usageLimitsData.hasSetLimits && totalCost > 20 && (
        <div mt-8 p-4 bg-yellow-50 rounded-md border-yellow-200">
          <p className="text-sm text-yellow-800">
            ⚠️ Your AI usage cost (${totalCost.toFixed(2)}) exceeds $20. Consider setting 
            usage limits to control spending. Estimated monthly cost: ${estimatedMonthlyCost.toFixed(2)}.
          </p>
        </div>
      )}
    </div>
  );
}