import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import {
  healthJsonResponse,
  validateHealthMethod,
} from '../_shared/healthHttp.ts'

Deno.serve(async (request) => {
  const method =
    validateHealthMethod(request)

  if (!method.allowed) {
    return healthJsonResponse(
      {
        status: 'method_not_allowed',
      },
      {
        status: 405,
      }
    )
  }

  const supabaseUrl =
    Deno.env.get('SUPABASE_URL')
  const serviceRoleKey =
    Deno.env.get(
      'SUPABASE_SERVICE_ROLE_KEY'
    )

  if (
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    console.error(
      JSON.stringify({
        event:
          'platform_health_configuration_error',
        code:
          'HEALTH_CONFIGURATION_MISSING',
      })
    )

    return healthJsonResponse(
      {
        status: 'unavailable',
      },
      {
        status: 503,
        head: method.head,
      }
    )
  }

  try {
    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    const {
      data,
      error,
    } = await supabase.rpc(
      'get_platform_health_probe'
    )

    if (
      error ||
      data?.status !== 'ok'
    ) {
      console.error(
        JSON.stringify({
          event:
            'platform_health_probe_failed',
          code:
            'HEALTH_DATABASE_UNAVAILABLE',
        })
      )

      return healthJsonResponse(
        {
          status: 'unavailable',
        },
        {
          status: 503,
          head: method.head,
        }
      )
    }

    return healthJsonResponse(
      {
        status: 'ok',
        checked_at:
          data.checked_at,
      },
      {
        head: method.head,
      }
    )
  } catch {
    console.error(
      JSON.stringify({
        event:
          'platform_health_probe_failed',
        code:
          'HEALTH_INTERNAL_ERROR',
      })
    )

    return healthJsonResponse(
      {
        status: 'unavailable',
      },
      {
        status: 503,
        head: method.head,
      }
    )
  }
})
