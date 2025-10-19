import { createClient } from 'npm:@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // データベースに簡単なクエリを実行してアクティブに保つ
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .limit(1);

    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('id')
      .limit(1);

    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id')
      .limit(1);

    const timestamp = new Date().toISOString();
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Database keep-alive check completed',
        timestamp: timestamp,
        checks: {
          orders: ordersError ? 'error' : 'ok',
          menuItems: menuError ? 'error' : 'ok',
          customers: customersError ? 'error' : 'ok',
        },
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});