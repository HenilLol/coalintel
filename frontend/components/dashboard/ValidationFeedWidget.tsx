'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ShieldCheck, AlertTriangle, ChevronRight } from 'lucide-react';
import { ValidationFeedItem } from '@/types/dashboard';

interface ValidationFeedWidgetProps {
  items?: ValidationFeedItem[];
  loading?: boolean;
}

const defaultFeed: ValidationFeedWidgetProps['items'] = [
  {
    id: 1,
    mine_name: 'Rajmahal OpenCast',
    subsidiary: 'ECL',
    metric_name: 'Coal Production',
    fiscal_year: '2023-24',
    reported_value: 4.25,
    calculated_value: 4.25,
    standard_unit: 'MT',
    percentage_difference: 1.68,
    validation_status: 'CONFLICT_DETECTED',
    message: 'Cross-document discrepancy > 1% detected between Annual Report (4.25 MT) and Audit disclosure (4.18 MT).',
    document_id: 1,
    filename: 'ECL_Annual_Report_2023-24.pdf',
  },
  {
    id: 2,
    mine_name: 'Gevra OC',
    subsidiary: 'SECL',
    metric_name: 'Overburden Removal',
    fiscal_year: '2023-24',
    reported_value: 310.5,
    calculated_value: 310.5,
    standard_unit: 'M.Cu.M',
    percentage_difference: 5.2,
    validation_status: 'WARNING_ARITHMETIC',
    message: 'Child mine sum total discrepancy exceeds 5% arithmetic threshold.',
    document_id: 3,
    filename: 'SECL_Gevra_Monthly_Despatch.csv',
  },
  {
    id: 3,
    mine_name: 'Samaleswari OC',
    subsidiary: 'MCL',
    metric_name: 'Coal Production',
    fiscal_year: '2023-24',
    reported_value: 193.3,
    calculated_value: 193.3,
    standard_unit: 'MT',
    percentage_difference: 0.0,
    validation_status: 'VALIDATED',
    message: 'Deterministic unit conversion (MT) and arithmetic verified with 99.5% confidence score.',
    document_id: 4,
    filename: 'MCL_Samaleswari_Performance.xlsx',
  },
];

export const ValidationFeedWidget: React.FC<ValidationFeedWidgetProps> = ({
  items = defaultFeed,
  loading = false,
}) => {
  const displayItems = items && items.length > 0 ? items : defaultFeed;

  return (
    <Card className="col-span-1">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            <ShieldCheck className="h-5 w-5 text-green-600" />
            <span>Validation & Data Quality Feed</span>
          </CardTitle>
          <Link href="/validation" className="text-xs text-teal-600 hover:text-teal-700 font-mono flex items-center gap-1">
            View All <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <CardDescription>
          Real-time arithmetic tolerance checks (&gt;5%) and cross-document discrepancy alerts (&gt;1%).
        </CardDescription>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 w-full animate-pulse rounded-lg bg-ash" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {displayItems?.slice(0, 3).map((item) => {
              const isConflict = item.validation_status === 'CONFLICT_DETECTED';
              const isWarning = item.validation_status === 'WARNING_ARITHMETIC';

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-lg bg-ash/70 border border-steel hover:border-slateText/50 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">{item.mine_name}</span>
                    <Badge
                      variant={isConflict ? 'danger' : isWarning ? 'warning' : 'success'}
                      size="sm"
                    >
                      {item.validation_status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <p className="text-[11px] text-slateText line-clamp-2 leading-relaxed">
                    {item.message}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slateText pt-1">
                    <span>Metric: {item.metric_name}</span>
                    <span className="text-amber-600 font-bold">{item.reported_value} {item.standard_unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
