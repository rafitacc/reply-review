import { Segmented, SegmentedOption } from "@/components/ui/segmented";
import { PERIODS, type Period } from "@/lib/summary/period";

type Props = {
  current: Period;
  // Builds the page URL for a period, keeping the page's other filters.
  hrefFor: (period: Period) => string;
};

export function PeriodFilter({ current, hrefFor }: Props) {
  return (
    <Segmented label="Period">
      {PERIODS.map((period) => (
        <SegmentedOption key={period} href={hrefFor(period)} active={period === current}>
          {period} days
        </SegmentedOption>
      ))}
    </Segmented>
  );
}
