<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Loan Repayment Report</title>
    <style>
        :root {
            --border: #d1d5db;
            --header: #f3f4f6;
            --muted: #6b7280;
            --danger-bg: #fee2e2;
            --danger-text: #991b1b;
            --group-bg: #eff6ff;
            --group-total-bg: #f9fafb;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
            color: #111827;
            background: #ffffff;
            padding: 16px;
        }

        .toolbar {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: end;
            margin-bottom: 14px;
        }

        .toolbar label {
            font-size: 12px;
            color: var(--muted);
            display: block;
            margin-bottom: 4px;
        }

        .toolbar input,
        .toolbar button,
        .toolbar a {
            height: 36px;
            border-radius: 8px;
            border: 1px solid var(--border);
            padding: 0 12px;
            font-size: 14px;
            background: white;
            color: #111827;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }

        .toolbar button {
            background: #111827;
            color: #ffffff;
            border-color: #111827;
            cursor: pointer;
        }

        .toolbar .hint {
            font-size: 12px;
            color: var(--muted);
            margin-left: auto;
        }

        .report-wrap {
            overflow-x: auto;
            border: 1px solid var(--border);
            border-radius: 10px;
        }

        table {
            border-collapse: collapse;
            min-width: 1300px;
            width: 100%;
        }

        th,
        td {
            border: 1px solid var(--border);
            padding: 6px 8px;
            font-size: 12px;
            vertical-align: middle;
            white-space: nowrap;
        }

        thead th {
            background: var(--header);
            text-align: center;
            position: sticky;
            top: 0;
            z-index: 2;
        }

        td.text-left {
            text-align: left;
        }

        td.text-right {
            text-align: right;
        }

        .group-row td {
            background: var(--group-bg);
            font-weight: 700;
            text-align: left;
            position: sticky;
            left: 0;
            z-index: 1;
        }

        .group-total td {
            background: var(--group-total-bg);
            font-weight: 700;
        }

        .overdue {
            background: var(--danger-bg);
            color: var(--danger-text);
            font-weight: 700;
        }

        .badge {
            display: inline-block;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 10px;
            margin-left: 6px;
            color: #ffffff;
            background: #dc2626;
        }

        .empty {
            color: #9ca3af;
            text-align: center;
            padding: 20px;
        }

        @page {
            size: A4 landscape;
            margin: 10mm;
        }

        @media print {
            body {
                padding: 0;
            }

            .toolbar {
                display: none;
            }

            .report-wrap {
                border: none;
                border-radius: 0;
                overflow: visible;
            }

            table {
                min-width: 0;
            }

            thead th {
                position: static;
            }

            .group-row td {
                position: static;
            }
        }
    </style>
</head>
<body>
    <h2 style="margin: 0 0 8px 0;">Loan Repayment Report</h2>

    <form method="GET" class="toolbar">
        <div>
            <label for="from">From</label>
            <input type="date" id="from" name="from" value="{{ $fromDate }}">
        </div>
        <div>
            <label for="to">To</label>
            <input type="date" id="to" name="to" value="{{ $toDate }}">
        </div>
        <button type="submit">Apply</button>
        <a href="{{ route('reports.loan-repayment') }}">Reset</a>
        <button type="button" onclick="window.print()">Print</button>
        <span class="hint">Default range is 5 days when no date filter is provided.</span>
    </form>

    <div class="report-wrap">
        <table>
            <thead>
                <tr>
                    <th rowspan="2">#</th>
                    <th rowspan="2">Loan ID</th>
                    <th rowspan="2">Customer No</th>
                    <th rowspan="2">Customer Name</th>
                    <th rowspan="2">Contact No</th>
                    <th rowspan="2">Installment</th>
                    <th rowspan="2">Due Date</th>
                    <th rowspan="2">Balance</th>
                    @foreach($dateColumns as $date)
                        <th colspan="2">{{ \Carbon\Carbon::parse($date)->format('d M') }}</th>
                    @endforeach
                    <th rowspan="2">Period Paid</th>
                    <th rowspan="2">Period Correc.</th>
                </tr>
                <tr>
                    @foreach($dateColumns as $date)
                        <th>Paid</th>
                        <th>Correc.</th>
                    @endforeach
                </tr>
            </thead>
            <tbody>
                @forelse($reportGroups as $group)
                    <tr class="group-row">
                        <td colspan="{{ 10 + ($dateColumns->count() * 2) }}">
                            Group: {{ $group['title'] }}
                            @if($group['name'])
                                | Name: {{ $group['name'] }}
                            @endif
                            @if($group['center_name'])
                                | Center: {{ $group['center_name'] }}
                            @endif
                            | Loans: {{ $group['totals']['loan_count'] }}
                        </td>
                    </tr>

                    @foreach($group['rows'] as $index => $row)
                        <tr>
                            <td class="text-right">{{ $index + 1 }}</td>
                            <td class="text-right">{{ $row['loan_id'] }}</td>
                            <td>{{ $row['customer_no'] ?? '-' }}</td>
                            <td class="text-left">{{ $row['customer_name'] ?? '-' }}</td>
                            <td>{{ $row['contact_no'] ?? '-' }}</td>
                            <td class="text-right">{{ number_format($row['installment_amount'], 2) }}</td>
                            <td>{{ $row['due_date'] ?? '-' }}</td>
                            <td class="text-right {{ $row['is_overdue'] ? 'overdue' : '' }}">
                                {{ number_format($row['balance'], 2) }}
                                @if($row['is_overdue'])
                                    <span class="badge">Overdue</span>
                                @endif
                            </td>

                            @foreach($dateColumns as $date)
                                <td class="text-right">
                                    {{ $row['daily'][$date]['paid'] > 0 ? number_format($row['daily'][$date]['paid'], 2) : '' }}
                                </td>
                                <td class="text-right">
                                    {{ $row['daily'][$date]['correction'] > 0 ? number_format($row['daily'][$date]['correction'], 2) : '' }}
                                </td>
                            @endforeach

                            <td class="text-right">{{ number_format($row['period_paid'], 2) }}</td>
                            <td class="text-right">{{ number_format($row['period_correction'], 2) }}</td>
                        </tr>
                    @endforeach

                    <tr class="group-total">
                        <td colspan="5" class="text-left">Group Total</td>
                        <td class="text-right">{{ number_format($group['totals']['installment'], 2) }}</td>
                        <td></td>
                        <td class="text-right">{{ number_format($group['totals']['balance'], 2) }}</td>

                        @foreach($dateColumns as $date)
                            <td class="text-right">{{ number_format($group['date_totals'][$date]['paid'], 2) }}</td>
                            <td class="text-right">{{ number_format($group['date_totals'][$date]['correction'], 2) }}</td>
                        @endforeach

                        <td class="text-right">{{ number_format($group['totals']['period_paid'], 2) }}</td>
                        <td class="text-right">{{ number_format($group['totals']['period_correction'], 2) }}</td>
                    </tr>
                @empty
                    <tr>
                        <td class="empty" colspan="{{ 10 + ($dateColumns->count() * 2) }}">
                            No loans found for the selected period.
                        </td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>
</body>
</html>
