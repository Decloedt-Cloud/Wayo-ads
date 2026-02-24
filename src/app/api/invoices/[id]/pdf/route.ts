import React from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/server-auth';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  brand: {
    fontSize: 18,
    fontWeight: 700,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    textAlign: 'right',
  },
  smallText: {
    fontSize: 10,
    color: '#555555',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    flexDirection: 'column',
  },
  table: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 2,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  tableCellDescription: {
    flex: 3,
    fontSize: 11,
  },
  tableCellAmount: {
    flex: 1,
    fontSize: 11,
    textAlign: 'right',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  totalsLabel: {
    fontSize: 11,
    marginRight: 12,
  },
  totalsValue: {
    fontSize: 11,
    fontWeight: 700,
  },
  footer: {
    marginTop: 32,
    fontSize: 9,
    color: '#777777',
    textAlign: 'center',
  },
});

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

type InvoiceType = 'DEPOSIT' | 'PAYOUT' | 'BILLING';
type InvoiceRoleType = 'CREATOR' | 'ADVERTISER';
type InvoiceStatus = 'PENDING' | 'PAID' | 'CANCELLED';

function invoiceTypeLabel(type: InvoiceType, roleType: InvoiceRoleType) {
  if (type === 'DEPOSIT') return 'Wallet Deposit';
  if (type === 'BILLING') return 'Campaign Budget';
  if (type === 'PAYOUT' && roleType === 'CREATOR') return 'Creator Payout';
  return type;
}

function invoiceStatusLabel(status: InvoiceStatus) {
  if (status === 'PAID') return 'Paid';
  if (status === 'PENDING') return 'Pending';
  if (status === 'CANCELLED') return 'Cancelled';
  return status;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const user = await getCurrentUser();

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const invoice = await (db as any).invoice.findUnique({
    where: { id },
    include: {
      user: {
        include: {
          creatorBusinessProfile: true,
        },
      },
    },
  });

  if (!invoice) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const isOwner = invoice.userId === user.id;
  const isAdmin = user.roles?.includes('SUPERADMIN');

  if (!isOwner && !isAdmin) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const businessProfile = invoice.user.creatorBusinessProfile;
  const hasBusinessInfo = businessProfile && (
    businessProfile.companyName ||
    businessProfile.vatNumber ||
    businessProfile.addressLine1
  );

  const currency = 'EUR';
  const typeLabel = invoiceTypeLabel(invoice.invoiceType, invoice.roleType);
  const statusLabel = invoiceStatusLabel(invoice.status);
  const subtotalCents = invoice.totalAmountCents - (invoice.taxAmountCents ?? 0);
  const issuedDate = formatDate(invoice.createdAt);
  const paidDate = invoice.paidAt ? formatDate(invoice.paidAt) : null;

  const doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(
        View,
        { style: styles.headerRow },
        React.createElement(
          View,
          { style: styles.column },
          React.createElement(Text, { style: styles.brand }, 'Wayo Ads'),
          React.createElement(
            Text,
            { style: styles.smallText },
            'Marketplace for local creator campaigns'
          )
        ),
        React.createElement(
          View,
          { style: styles.column },
          React.createElement(Text, { style: styles.title }, 'Invoice'),
          React.createElement(
            Text,
            { style: styles.smallText },
            `Invoice #: ${invoice.invoiceNumber}`
          ),
          React.createElement(
            Text,
            { style: styles.smallText },
            `Issued: ${issuedDate}`
          ),
          paidDate
            ? React.createElement(
                Text,
                { style: styles.smallText },
                `Paid: ${paidDate}`
              )
            : null
        )
      ),
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Billed To'),
        hasBusinessInfo && businessProfile.companyName
          ? React.createElement(Text, null, businessProfile.companyName)
          : React.createElement(Text, null, invoice.user.name || invoice.user.email),
        hasBusinessInfo && businessProfile.vatNumber
          ? React.createElement(Text, { style: styles.smallText }, `VAT: ${businessProfile.vatNumber}`)
          : null,
        React.createElement(Text, { style: styles.smallText }, invoice.user.email),
        hasBusinessInfo && businessProfile.addressLine1
          ? React.createElement(
              Text,
              { style: styles.smallText },
              [
                businessProfile.addressLine1,
                businessProfile.addressLine2,
                businessProfile.city,
                businessProfile.postalCode,
                businessProfile.state,
                businessProfile.countryCode,
              ]
                .filter(Boolean)
                .join(', ')
            )
          : null
      ),
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Invoice Details'),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(
            Text,
            { style: styles.smallText },
            `Type: ${typeLabel}`
          ),
          React.createElement(
            Text,
            { style: styles.smallText },
            `Status: ${statusLabel}`
          )
        )
      ),
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Summary'),
        React.createElement(
          View,
          { style: styles.table },
          React.createElement(
            View,
            { style: styles.tableHeaderRow },
            React.createElement(
              Text,
              { style: styles.tableCellDescription },
              'Description'
            ),
            React.createElement(
              Text,
              { style: styles.tableCellAmount },
              'Amount'
            )
          ),
          React.createElement(
            View,
            { style: styles.tableRow },
            React.createElement(
              Text,
              { style: styles.tableCellDescription },
              typeLabel
            ),
            React.createElement(
              Text,
              { style: styles.tableCellAmount },
              formatCurrency(invoice.totalAmountCents, currency)
            )
          )
        ),
        React.createElement(
          View,
          { style: styles.totalsRow },
          React.createElement(
            View,
            { style: styles.column },
            React.createElement(
              Text,
              { style: styles.totalsLabel },
              `Subtotal: ${formatCurrency(subtotalCents, currency)}`
            ),
            React.createElement(
              Text,
              { style: styles.totalsLabel },
              `Tax: ${formatCurrency(invoice.taxAmountCents ?? 0, currency)}`
            ),
            React.createElement(
              Text,
              { style: styles.totalsValue },
              `Total: ${formatCurrency(invoice.totalAmountCents, currency)}`
            )
          )
        )
      ),
      React.createElement(
        Text,
        { style: styles.footer },
        'Thank you for using Wayo Ads. This invoice was generated automatically.'
      )
    )
  );

  const filename = `invoice-${invoice.invoiceNumber}.pdf`;

  const buffer = (await renderToBuffer(doc)) as any;
  const body = buffer as Uint8Array;

  return new NextResponse(body as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
