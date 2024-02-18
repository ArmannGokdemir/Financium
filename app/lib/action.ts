'use server';

import { z as zod } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { stat } from 'fs';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

const FormSchema = zod.object({
  id: zod.string(),
  customerId: zod.string({
    invalid_type_error: 'Please select a customer',
  }),
  amount: zod.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0' }), // changing data to number type because even if the input is a value type it returns a string and our db expects a number value
  status: zod.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status',
  }),
  date: zod.string(),
});
const CreateInvoice = FormSchema.omit({ id: true, date: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function createInvoice(prevState: State, formData: FormData) {
  // prevState - contains the state passed from the useFormState hook.
  const validatedFields = CreateInvoice.safeParse({
    // const rawFormData = Object.fromEntries(formData.entries())
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      messsage: 'Missing Fields. Failed to Create Invoice',
    };
  }
  const { customerId, amount, status } = validatedFields.data;

  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  // Inserting data into db
  try {
    await sql`INSERT INTO invoices (customer_id,amount,status,date)
 VALUES (${customerId}, ${amountInCents}, ${status},${date})`;
  } catch (error) {
    return { message: 'Database Error:Failed to Create Invoice' };
  }

  revalidatePath('/dashboard/invoices'); // because next js has a client-side router cache that stores route segments in users browser along with prefetching to display the new data we use revalidate path Once the database has been updated, the /dashboard/invoices path will be revalidated, and fresh data will be fetched from the server.
  redirect('/dashboard/invoices');
  //   console.log(rawFormData);
}

const UpdateInvoice = FormSchema.omit({ id: true, date: true });
export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData,
) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      messsage: 'Missing Fields. Failed to Create Invoice',
    };
  }

  const { customerId, amount, status } = validatedFields.data;

  const amountInCents = amount * 100;

  try {
    await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `;
  } catch (error) {
    console.error('id: ', id, error);
    return { message: 'Database Error:Failed to Update Invoice' };
  }
  revalidatePath('/dashboard/invoices'); // to clear the client cache and make a new server request.
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  // throw new Error('Failed to Delete Invoice');
  try {
    await sql`
 DELETE FROM invoices WHERE id = ${id}`;
  } catch (error) {
    return { message: 'Database Error: Failed to Delete Invoice' };
  }
  revalidatePath('/dashboard/invoices');
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials';
        default:
          return 'Something went wrong';
      }
    }
    throw error;
  }
}
