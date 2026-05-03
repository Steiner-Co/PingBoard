import type { CheckResult, MonitorType } from '@pingboard/shared'
import type { Monitor } from '@pingboard/db'
import { checkHttp } from './http'
import { checkTcp } from './tcp'
import { checkPing } from './ping'
import { checkDns } from './dns'

const checkers: Record<MonitorType, (m: Monitor) => Promise<CheckResult>> = {
  http: checkHttp,
  tcp: checkTcp,
  ping: checkPing,
  dns: checkDns,
}

export async function runCheck(monitor: Monitor): Promise<CheckResult> {
  const checker = checkers[monitor.type]
  if (!checker) {
    return {
      status: 'down',
      responseTimeMs: null,
      statusCode: null,
      message: `Unknown monitor type: ${monitor.type}`,
      checkedAt: new Date(),
    }
  }
  return checker(monitor)
}

export { checkHttp, checkTcp, checkPing, checkDns }
