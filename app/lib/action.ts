'use server';

import { z as zod } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { stat } from 'fs';

const FormSchema = zod.object({
  id: zod.string(),
  customerId: zod.string(),
  amount: zod.coerce.number(), // changind data to number type because even if the input is a value type it returns a string and our db expects a number value
  status: zod.enum(['pending', 'paid']),
  date: zod.string(),
});
const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
  const { customerId, amount, status } = CreateInvoice.parse({
    // const rawFormData = Object.fromEntries(formData.entries())
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  await sql`INSERT INTO invoices (customer_id,amount,status,date)
             VALUES (${customerId}, ${amountInCents}, ${status},${date})`;

  revalidatePath('/dashboard/invoices'); // because next js has a client-side router cache that stores route segments in users browser along with prefetching to display the new data we use revalidate path Once the database has been updated, the /dashboard/invoices path will be revalidated, and fresh data will be fetched from the server.
  redirect('/dashboard/invoices');
  //   console.log(rawFormData);
}

const UpdateInvoice = FormSchema.omit({ id: true, date: true });
export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  const amountInCents = amount * 100;

  await sql`
  UPDATE invoices
  SET customer_id=${customerId},amount=${amountInCents},status${status}
  WHERE id = ${id}`;
  revalidatePath('/dashboard/invoices'); // to clear the client cache and make a new server request.
  redirect('/dashboard/invoices');
}
