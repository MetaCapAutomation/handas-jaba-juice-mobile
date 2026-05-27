# Handas Jaba Juice — Backend Reference

> **Audience:** Mobile app developers building the Handas Jaba Juice native app.  
> The mobile app shares this exact backend — same Supabase database, same Edge Functions, same Auth system.  
> Do **not** create a separate backend. Everything you need is documented here.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Project Credentials & Environment](#2-project-credentials--environment)
3. [Authentication & User Types](#3-authentication--user-types)
4. [Database Schema](#4-database-schema)
5. [Row Level Security (RLS)](#5-row-level-security-rls)
6. [Edge Functions Reference](#6-edge-functions-reference)
7. [Payment Flow (Paystack)](#7-payment-flow-paystack)
8. [Delivery & Logistics](#8-delivery--logistics)
9. [Email Communication (Resend)](#9-email-communication-resend)
10. [Storage Buckets](#10-storage-buckets)
11. [Real-Time Features](#11-real-time-features)
12. [Customer Flows — End to End](#12-customer-flows--end-to-end)
13. [Staff Portal Flows](#13-staff-portal-flows)
14. [Mobile App Integration Guide](#14-mobile-app-integration-guide)

---

## 1. Tech Stack

| Layer | Technology |
|-------|-----------|
| Database | PostgreSQL 15 via Supabase |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Serverless functions | Supabase Edge Functions (Deno/TypeScript) |
| Storage | Supabase Storage |
| Payments | Paystack (KES currency) |
| Email | Resend API (`email@handasjuice.com`) |
| Maps / Geocoding | Google Maps Geocoding API |
| Web frontend | Vite + React + TypeScript |

Supabase Project ID: `quvxhyfmzlealancapaq`  
Supabase URL: `https://quvxhyfmzlealancapaq.supabase.co`

---

## 2. Project Credentials & Environment

### Frontend / Mobile (public, safe to ship in app)

```
SUPABASE_URL=https://quvxhyfmzlealancapaq.supabase.co
SUPABASE_ANON_KEY=<anon key — fetch from Supabase dashboard>
```

Use the anon key for all client-side Supabase calls. RLS policies enforce access control.

### Edge Function Secrets (server-side only, never in mobile app)

| Secret | Purpose |
|--------|---------|
| `PAYSTACK_SECRET_KEY` | Paystack payment verification & initialization |
| `GOOGLE_MAPS_API_KEY` | Address geocoding for delivery fee calculation |
| `RESEND_API_KEY` | Transactional email sending |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin DB operations inside Edge Functions |
| `SUPABASE_ANON_KEY` | Token verification inside Edge Functions |

---

## 3. Authentication & User Types

### Auth Methods

1. **Email + Password** — `supabase.auth.signUp()` / `supabase.auth.signInWithPassword()`
2. **Google OAuth** — `supabase.auth.signInWithOAuth({ provider: 'google' })`

### Session Management

Supabase returns a JWT access token + refresh token. The SDK auto-refreshes the session. In the mobile app, persist the session with secure storage (e.g., `expo-secure-store`).

```typescript
// Initialize client (mobile)
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### User Roles

Roles are stored in `public.user_roles`. A user can have exactly one role.

| Role | Enum value | Description |
|------|-----------|-------------|
| Customer | `user` | Default for all signups; can place orders, view own data |
| Admin | `admin` | Full system access; manages orders, products, staff, blogs |
| Branch Manager | `branch_manager` | Manages one branch: inventory, orders, deliveries, riders |
| Rider | `rider` | Delivery personnel; updates own location; sees own assigned orders |
| Moderator | `moderator` | Content management access |

**Regular customers have no row in `user_roles`** — their access is governed by RLS policies that check `auth.uid()` directly.

### Profile Auto-Creation

On every new signup, a database trigger `on_auth_user_created` fires `handle_new_user()` which creates a row in `public.profiles` with the user's `first_name` from signup metadata.

### Checking Role in Mobile App

```typescript
// Check if current user is admin (example pattern)
const { data } = await supabase.rpc('has_role', {
  _user_id: session.user.id,
  _role: 'admin',
});
// data === true if admin

// Get role for routing decisions
const { data: roleData } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', session.user.id)
  .maybeSingle();
// roleData?.role === 'rider' | 'branch_manager' | 'admin' | null (customer)
```

### Rider Login Flow

Riders are created by admins via the `manage-rider` Edge Function. A rider account is a regular Supabase auth user with:
- `user_roles.role = 'rider'`
- A corresponding row in `public.riders` linked via `riders.user_id`
- A `must_change_password` flag in `user_metadata`

---

## 4. Database Schema

### Enums

```sql
order_status: 'pending' | 'paid' | 'processing' | 'confirmed' | 'out_for_delivery' | 'delivered' | 'cancelled'
app_role:     'admin' | 'moderator' | 'user' | 'branch_manager' | 'rider'
```

---

### `public.profiles`
One row per authenticated user. Auto-created on signup.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid UNIQUE FK → auth.users | |
| `first_name` | text | Set from signup metadata |
| `last_name` | text | |
| `phone_number` | text | |
| `location` | text | Free-form address string |
| `avatar_url` | text | URL — synced from Google OAuth |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | Auto-updated by trigger |

**RLS:** Users can only read/write their own profile row.

---

### `public.user_roles`
Role assignments. Customers have no row here.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid FK → auth.users | |
| `role` | app_role | `admin`, `branch_manager`, `rider`, `moderator`, `user` |
| `created_at` | timestamptz | |

---

### `public.orders`
Central order record. Guest orders have `user_id = NULL`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid nullable FK → auth.users | NULL for guest orders |
| `order_number` | text UNIQUE | Format: auto-generated alphanumeric |
| `status` | order_status | See enum above |
| `customer_name` | text | |
| `customer_email` | text | |
| `delivery_address` | text | Full text address |
| `delivery_phone` | text | |
| `delivery_lat` | float8 | Geocoded latitude |
| `delivery_lng` | float8 | Geocoded longitude |
| `delivery_fee` | numeric | Stored fee in KES |
| `items` | jsonb | Array of `OrderItem` objects (see below) |
| `notes` | text | Customer notes |
| `total_amount` | numeric | Final charge including delivery |
| `coupon_code` | text | Applied coupon code |
| `discount_amount` | numeric | Discount value in KES, default 0 |
| `payment_reference` | text | Paystack transaction reference |
| `branch_id` | uuid FK → branches | Assigned store |
| `rider_id` | uuid FK → riders | Assigned delivery rider |
| `is_international` | boolean | Default false |
| `country` | text | For international orders |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**OrderItem JSON structure:**
```json
{
  "name": "Jaba Juice",
  "quantity": 2,
  "price": 350,
  "variation": "Hibiscus · 1 Litre",
  "image": "https://..."
}
```

**Order status lifecycle:**
```
pending → paid → processing → confirmed → out_for_delivery → delivered
                                                           ↘ cancelled
```

---

### `public.products`
Product catalog shown on the website/app shop.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `inventory_id` | uuid FK → inventory | Links to stock record |
| `slug` | text UNIQUE | URL-safe identifier e.g. `jaba-juice-hibiscus` |
| `short_name` | text | Display name in cart/order |
| `full_description` | text | Rich text description |
| `badge` | text | Label like "Best Seller", "New" |
| `category` | text | e.g. "Juices", "Party Packs" |
| `features` | text[] | Bullet point features |
| `perfect_for` | text[] | Use-case tags |
| `image_url` | text | Main product image |
| `additional_images` | text[] | Gallery images |
| `display_on_website` | boolean | Whether visible on shop page |
| `is_archived` | boolean | Soft delete |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### `public.product_variations`
Size and flavor variations for products.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `inventory_id` | uuid FK → inventory | Parent inventory item |
| `variation_type` | text | `'size'` or `'flavor'` |
| `name` | text | e.g. `"1 Litre"`, `"Hibiscus"` |
| `price` | numeric | Price for this variation (overrides base) |
| `image_url` | text | Optional variation-specific image |
| `is_active` | boolean | |
| `sort_order` | integer | Display order |

Cart item key format: `{productId}_s{sizeVariationId}_f{flavorVariationId}`

---

### `public.inventory`
Master stock tracking. One row per SKU/product.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `name` | text | Product name |
| `price` | numeric | Base price in KES |
| `image_url` | text | |
| `stock` | integer | Total global stock count |
| `is_archived` | boolean | |
| `created_at` / `updated_at` | timestamptz | |

---

### `public.branches`
Physical store locations.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `name` | text | Store display name |
| `code` | text UNIQUE | Short identifier e.g. `KAR-01` |
| `address` | text | Full address |
| `city` | text | |
| `phone` | text | |
| `email` | text | |
| `status` | text | `'active'` or `'inactive'` |
| `manager_id` | uuid FK → auth.users | Assigned branch manager |
| `image_url` | text | |
| `opening_hours` | text | |
| `latitude` / `longitude` | float8 | GPS coordinates (auto-geocoded) |
| `created_at` / `updated_at` | timestamptz | |

---

### `public.branch_inventory`
Per-branch stock levels. Each branch has independent counts.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `branch_id` | uuid FK → branches | |
| `inventory_id` | uuid FK → inventory | |
| `quantity` | integer | Current stock at this branch |
| `low_stock_threshold` | integer | Alert threshold (default 10) |

---

### `public.riders`
Delivery rider profiles. Linked to an auth user.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid FK → auth.users | Linked auth account |
| `branch_id` | uuid FK → branches | Home branch |
| `full_name` | text | |
| `email` | text | |
| `phone` | text | |
| `status` | text | `'active'` / `'inactive'` |
| `license_plate` | text | |
| `motorcycle_images` | text[] | Array of image URLs |
| `avatar_url` | text | |
| `notes` | text | Admin notes |

---

### `public.rider_locations`
Real-time GPS. One row per rider (unique constraint on `rider_id`). Upserted on every location update.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `rider_id` | uuid UNIQUE FK → riders | |
| `latitude` | float8 | |
| `longitude` | float8 | |
| `heading` | float8 | Direction of travel (degrees) |
| `speed` | float8 | Speed in m/s |
| `accuracy` | float8 | GPS accuracy in metres |
| `updated_at` | timestamptz | Timestamp of last ping |

---

### `public.blogs`
CMS blog posts.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `title` | text | |
| `slug` | text UNIQUE | URL path e.g. `health-benefits-jaba` |
| `excerpt` | text | Short preview text |
| `content` | text | HTML from rich text editor |
| `cover_image_url` | text | |
| `cover_image_position` | text | CSS object-position e.g. `'center center'` |
| `cover_image_fit` | text | CSS object-fit: `'cover'`, `'contain'`, `'fill'` |
| `category` | text | One of: General, Health & Wellness, Recipes, News, Tips & Tricks, Behind the Scenes |
| `tags` | text[] | |
| `is_published` | boolean | Whether visible publicly |
| `is_archived` | boolean | Soft delete |
| `author_name` | text | Default: `'Handas Team'` |
| `read_time_minutes` | integer | Auto-calculated from word count |
| `created_at` / `updated_at` | timestamptz | |

**Public URL:** Blogs are served at `handasjuice.com/{slug}` (catch-all route).

---

### `public.support_tickets`
Customer support requests.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `ticket_number` | text UNIQUE | Auto-generated |
| `subject` | text | |
| `description` | text | |
| `status` | text | `open` / `in_progress` / `resolved` / `closed` |
| `priority` | text | `low` / `medium` / `high` / `urgent` |
| `category` | text | Ticket type (general, order, delivery, etc.) |
| `source` | text | `customer` or `branch` |
| `branch_id` | uuid FK → branches | If branch-originated |
| `customer_name` / `customer_email` / `customer_phone` | text | |
| `user_id` | uuid | If authenticated customer |
| `assigned_to` | uuid | Staff assigned to handle |

---

### `public.ticket_responses`
Threaded replies on support tickets.

| Column | Type | Notes |
|--------|------|-------|
| `ticket_id` | uuid FK → support_tickets | |
| `responder_id` | uuid | Auth user who replied |
| `responder_name` / `responder_email` / `responder_role` | text | |
| `content` | text | Reply text |
| `is_internal` | boolean | Staff-only note if true |
| `attachment_url` / `attachment_name` / `attachment_type` | text | Optional file attachment |

---

### `public.applications`
Ambassador and wholesale partner applications.

| Column | Type | Notes |
|--------|------|-------|
| `type` | text | `'ambassador'` or `'wholesale'` |
| `full_name` / `email` / `phone` / `location` | text | |
| `status` | text | `pending` / `approved` / `rejected` |
| `admin_notes` | text | Internal notes |
| `social_media_handle` / `follower_count` / `platforms` | text / text[] | Ambassador fields |
| `business_name` / `intended_quantity` / `delivery_date` / `business_type` | text/date | Wholesale fields |

---

### `public.coupons`
Discount codes.

| Column | Type | Notes |
|--------|------|-------|
| `code` | text UNIQUE | Coupon code string |
| `type` | text | `'percentage'` or `'fixed'` |
| `discount_value` | numeric | % off or KES off |
| `min_order_amount` | numeric | Minimum cart value to apply |
| `max_uses` | integer | NULL = unlimited |
| `used_count` | integer | Incremented on successful use |
| `is_active` | boolean | |
| `expires_at` | timestamptz | NULL = no expiry |
| `is_archived` | boolean | |

---

### `public.branch_users`
Staff assignment to branches (non-manager roles).

| Column | Type | Notes |
|--------|------|-------|
| `branch_id` | uuid FK → branches | |
| `user_id` | uuid FK → auth.users | |
| `role` | text | `'staff'`, `'manager'`, etc. |

---

### `public.restock_requests`
Branch managers request stock from admin.

| Column | Type | Notes |
|--------|------|-------|
| `branch_id` / `inventory_id` | uuid FK | |
| `requested_by` | uuid FK → auth.users | |
| `quantity` | integer | Units requested |
| `status` | text | `pending` / `approved` / `rejected` / `fulfilled` |
| `reviewed_by` / `reviewed_at` / `review_notes` | mixed | Admin review info |

---

### `public.admin_notifications`
In-app notifications for admin/staff.

| Column | Type | Notes |
|--------|------|-------|
| `type` | text | Category e.g. `new_order`, `low_stock` |
| `title` / `message` | text | |
| `metadata` | jsonb | Contextual data (order id, etc.) |
| `is_read` | boolean | |

---

### `public.chat_channels` / `public.chat_channel_members` / `public.chat_messages`
Internal team messaging between admin and branch staff.

**chat_channels:**
- `type`: `'group'` or `'dm'`
- `created_by`: UUID of creator

**chat_channel_members:** Junction table — user ↔ channel, with `is_admin` flag.

**chat_messages:**
- `content`: message text
- `attachment_url` / `attachment_name` / `attachment_type`: optional file

---

### `public.newsletter_subscribers`

| Column | Type | Notes |
|--------|------|-------|
| `email` | text UNIQUE | |
| `source` | text | Where they subscribed: `'footer'`, `'blog'` |
| `is_active` | boolean | Unsubscribe sets to false |
| `subscribed_at` | timestamptz | |

---

### `public.inquiries`
Contact form submissions.

| Column | Type | Notes |
|--------|------|-------|
| `name` / `email` / `phone` | text | |
| `subject` / `message` | text | |
| `is_read` | boolean | Admin read status |

---

## 5. Row Level Security (RLS)

All tables have RLS enabled. Core patterns:

```sql
-- Customers see only their own data
USING (auth.uid() = user_id)

-- Admins bypass via has_role()
USING (has_role(auth.uid(), 'admin'))

-- Public read (blogs, products)
USING (is_published = true AND is_archived = false)

-- Guest orders allowed
WITH CHECK (auth.uid() = user_id OR user_id IS NULL)
```

### Key helper function

```sql
-- Security-definer function to prevent recursive RLS loops
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

Call from mobile: `await supabase.rpc('has_role', { _user_id: uid, _role: 'rider' })`

---

## 6. Edge Functions Reference

All Edge Functions live at:  
`https://quvxhyfmzlealancapaq.supabase.co/functions/v1/{function-name}`

Call from mobile with the user's JWT:
```typescript
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { ...payload },
});
```

Functions that require admin auth check the JWT and call `has_role()` internally.

---

### Payment Functions

#### `initialize-payment`
Creates a Paystack transaction and returns the payment URL.

**Request:**
```json
{
  "email": "customer@example.com",
  "amount": 1200,
  "metadata": {
    "customer_name": "Jane Doe",
    "phone": "+254712345678",
    "delivery_address": "123 Westlands, Nairobi",
    "items": [{ "name": "Jaba Juice", "quantity": 2, "price": 350 }],
    "notes": "Leave at gate",
    "user_id": "uuid-or-omit-for-guest"
  }
}
```

**Response:**
```json
{
  "success": true,
  "authorization_url": "https://checkout.paystack.com/...",
  "access_code": "...",
  "reference": "HANDA-1715000000000-ABCDEF"
}
```

Reference format: `HANDA-{timestamp}-{random6chars}`  
Amount is in KES. The function multiplies by 100 internally for Paystack (kobo).

---

#### `verify-payment`
Verifies a Paystack transaction and updates the order to `paid`. Also triggers the confirmation email.

**Request:**
```json
{
  "reference": "HANDA-1715000000000-ABCDEF",
  "orderNumber": "ORD-12345"
}
```

**Response:**
```json
{
  "success": true,
  "payment_verified": true,
  "order_updated": true,
  "order": { "id": "...", "order_number": "...", "status": "paid", ... }
}
```

---

#### `get-payment-config`
Returns the Paystack public key for frontend SDK initialization.

**Response:** `{ "publicKey": "pk_live_..." }`

---

#### `paystack-webhook`
Receives `charge.success` events from Paystack as a backup payment verification. Automatically updates orders and sends confirmation emails when a payment event is received directly from Paystack (handles cases where the frontend redirect fails).

---

### Delivery Functions

#### `calculate-delivery-fee`
Geocodes the delivery address, finds the nearest active branch using Haversine distance, and returns the fee.

**Request:**
```json
{
  "delivery_address": "Westlands, Nairobi",
  "delivery_lat": -1.2634,
  "delivery_lng": 36.8030
}
```
If `delivery_lat`/`delivery_lng` are omitted, the address is geocoded via Google Maps.

**Response:**
```json
{
  "success": true,
  "store_id": "uuid",
  "store_name": "Westlands Branch",
  "distance_km": 2.4
}
```

**Fee calculation (done client-side from distance):**
```
≤ 2 km  →  KES 200 flat
> 2 km  →  KES 200 + (⌈distance - 2⌉ × KES 25)
```

---

#### `assign-order-store`
Assigns the nearest active branch to an order. Called after order creation.

**Request:** `{ "orderId": "uuid", "delivery_address": "...", "delivery_lat": ..., "delivery_lng": ... }`

**Response:** `{ "success": true, "branch_id": "uuid", "branch_name": "..." }`

---

### Email Functions

All email functions are called server-to-server (from `verify-payment`, `manage-rider`, etc.) using the service role key. They are **not called directly from the mobile app**.

| Function | Trigger | Recipient | Description |
|----------|---------|-----------|-------------|
| `send-order-confirmation` | Payment verified | Customer | Order receipt with items, total, delivery address, coupon applied |
| `send-order-created` | Order placed (pre-payment) | Customer | Payment pending notification |
| `send-delivery-confirmation` | Order → `out_for_delivery` | Customer | Rider is on the way |
| `send-order-store-notification` | Order assigned to branch | Branch manager | New order alert |
| `send-application-confirmation` | Application submitted | Applicant | Received confirmation with timeline |
| `send-support-notification` | Support ticket created | Customer | Ticket number confirmation |
| `send-team-credentials` | Staff account created | New staff | Login credentials |
| `send-inquiry-confirmation` | Contact form submitted | Submitter | Inquiry receipt |
| `notify-rider-assignment` | Rider assigned to order | Rider | Pickup instruction |

Sender: `Handas Jaba Juice <email@handasjuice.com>`  
Support email: `support@handasjuice.com`  
WhatsApp: `+254740866686`

---

### User Management Functions

#### `check-email-exists`
Called before signup to prevent duplicate accounts.

**Request:** `{ "email": "user@example.com" }`  
**Response:** `{ "exists": true }`

---

#### `manage-rider` (Admin only)
Creates rider auth accounts, updates rider data, assigns to branches.

**Actions:** `create_rider`, `update_rider`, `deactivate_rider`

All actions require a valid admin JWT in the `Authorization` header.

Create rider request:
```json
{
  "action": "create_rider",
  "full_name": "John Kamau",
  "email": "john@example.com",
  "phone": "+254712345678",
  "branch_id": "uuid",
  "license_plate": "KAA 123B"
}
```

Rider gets a Supabase auth account with a temporary password and `must_change_password: true` in metadata.

---

#### `manage-team` (Admin only)
Creates/updates admin and branch manager accounts.

**Actions:** `create_member`, `update_member`, `assign_branch`, `change_role`

---

#### `get-admin-users` (Admin only)
Returns all team members with their roles and branch assignments.

---

### Utility Functions

#### `lookup-order`
Guest order lookup — finds an order by email + order number (no auth required).

**Request:** `{ "email": "customer@example.com", "orderNumber": "ORD-12345" }`

---

#### `google-maps-proxy`
Proxies Google Maps API calls from the frontend to avoid exposing the API key. Used for address autocomplete.

---

#### `sitemap`
Returns the dynamic XML sitemap including all published blog slugs.

---

## 7. Payment Flow (Paystack)

Complete end-to-end payment flow:

```
1. Customer fills checkout form
2. Frontend creates order row in DB (status: 'pending')
3. Frontend calls initialize-payment Edge Function
4. Paystack returns authorization_url
5. Customer is redirected to Paystack checkout page
6. Customer pays
7. Paystack redirects back to /order-confirmation?reference=HANDA-...
8. Frontend calls verify-payment with the reference + orderNumber
9. verify-payment confirms with Paystack API
10. Order status updated to 'paid'
11. send-order-confirmation email fired
12. Order confirmation page shown to customer
```

**Backup path (webhook):**  
If step 7-12 fails (browser closed, network error), Paystack fires a `charge.success` webhook to `paystack-webhook`. This function re-runs verification and sends the email independently.

**International Orders:**  
When `is_international = true`, shipping is `⌈totalItems / 12⌉ × KES 25,000`. Processed through the Ridgeways branch.

---

## 8. Delivery & Logistics

### Delivery Fee Formula

```typescript
function calculateDeliveryFee(distanceKm: number): number {
  if (distanceKm <= 2) return 200;
  return 200 + Math.ceil(distanceKm - 2) * 25;
}
```

### Store Assignment

1. Customer enters delivery address
2. `calculate-delivery-fee` geocodes the address
3. Haversine distance calculated to all active branches
4. Nearest branch assigned to the order
5. Branch manager notified by email

### Rider Tracking

Riders send GPS updates via upsert to `rider_locations`:

```typescript
await supabase
  .from('rider_locations')
  .upsert(
    {
      rider_id: riderId,
      latitude: coords.latitude,
      longitude: coords.longitude,
      heading: coords.heading,
      speed: coords.speed,
      accuracy: coords.accuracy,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'rider_id' }
  );
```

Admins and branch managers subscribe to real-time changes on `rider_locations` to track riders live on the map.

### Order Status Transitions

| From | To | Who |
|------|----|-----|
| `pending` | `paid` | `verify-payment` Edge Function |
| `paid` | `processing` | Branch manager |
| `processing` | `confirmed` | Branch manager |
| `confirmed` | `out_for_delivery` | Branch manager (when rider picks up) |
| `out_for_delivery` | `delivered` | Rider or branch manager |
| Any | `cancelled` | Admin or branch manager |

---

## 9. Email Communication (Resend)

Email service: [Resend](https://resend.com)  
Sending domain: `handasjuice.com`  
From address: `Handas Jaba Juice <email@handasjuice.com>`

All emails are HTML-formatted with brand styling. Key content per email type:

**Order Confirmation** — includes:
- Order number, items list with images
- Subtotal, delivery fee, discount (if coupon applied), total
- Delivery address and phone
- International shipping note (if applicable)
- Support contact details

**Delivery Notification** — includes:
- Rider name and order number
- Estimated delivery time
- Support contact

**Team Credentials** — includes:
- Login URL
- Temporary password
- Instructions to change password on first login

---

## 10. Storage Buckets

Supabase Storage has two public buckets:

| Bucket | Path Patterns | Who Can Write | Notes |
|--------|---------------|--------------|-------|
| `avatars` | `avatars/{userId}.*` | Authenticated user (own path) | Profile pictures |
| `product-images` | `products/*`, `blog-covers/*`, `blog-content/*` | Admin only | Product & blog images |

**Fetching public URLs:**
```typescript
const { data } = supabase.storage
  .from('product-images')
  .getPublicUrl('blog-covers/1234567890.jpg');
// data.publicUrl = "https://quvxhyfmzlealancapaq.supabase.co/storage/v1/object/public/product-images/..."
```

**Uploading avatar (mobile):**
```typescript
const { error } = await supabase.storage
  .from('avatars')
  .upload(`avatars/${userId}.jpg`, fileBlob, { upsert: true });
```

---

## 11. Real-Time Features

Supabase Realtime is used for:

### Admin Order Feed
```typescript
supabase
  .channel('orders')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
    // New order received
  })
  .subscribe();
```

### Live Rider Location
```typescript
supabase
  .channel('rider-locations')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'rider_locations',
    filter: `rider_id=eq.${riderId}`,
  }, (payload) => {
    // Update map marker
  })
  .subscribe();
```

### Team Chat Messages
```typescript
supabase
  .channel(`chat-${channelId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_messages',
    filter: `channel_id=eq.${channelId}`,
  }, (payload) => {
    // Append new message
  })
  .subscribe();
```

### Admin Notifications
```typescript
supabase
  .channel('admin-notifications')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_notifications' }, (payload) => {
    // Show notification badge
  })
  .subscribe();
```

---

## 12. Customer Flows — End to End

### New Customer Registration

1. Check email exists: `check-email-exists` Edge Function
2. `supabase.auth.signUp({ email, password, options: { data: { first_name } } })`
3. DB trigger auto-creates `profiles` row
4. User lands on shop/home page

### Guest Checkout

1. Customer fills checkout (no login required)
2. `calculate-delivery-fee` called with delivery address
3. Order created in DB with `user_id = NULL`
4. Payment initialized → Paystack redirect → verified
5. Order confirmation shown
6. Later, customer can look up order via `lookup-order` (email + order number)

### Authenticated Customer Order

Same as guest, but `user_id` is set. Customer can view order history at `/orders`.

### Order Tracking

1. Authenticated: Query `orders` filtered by `user_id`
2. Guest: Call `lookup-order` with email + order number
3. Subscribe to realtime changes on the order for live status updates
4. When `rider_id` is set, subscribe to `rider_locations` for the rider

### Blog Reading

1. `GET /blogs?is_published=true&is_archived=false` ordered by `created_at DESC`
2. Blog detail: `GET /blogs?slug=eq.{slug}`
3. Blog URL pattern: `/{slug}` (no `/blog-2/` prefix)

### Support Ticket

1. Customer submits form → row inserted into `support_tickets`
2. `send-support-notification` fires automatically (via Edge Function or trigger)
3. Admin responds via `ticket_responses`
4. Customer sees thread in support page

### Newsletter Subscription

```typescript
await supabase.from('newsletter_subscribers').upsert(
  { email: email.toLowerCase(), source: 'app' },
  { onConflict: 'email', ignoreDuplicates: true }
);
```

### Contact Inquiry

```typescript
await supabase.from('inquiries').insert({
  name, email, phone, subject, message,
});
// send-inquiry-confirmation fires after insert
```

---

## 13. Staff Portal Flows

### Admin Flow

1. Log in at `/sys/login` — checks `user_roles.role = 'admin'`
2. Can manage: orders, products, inventory, blogs, riders, branches, coupons, support tickets, team, reports
3. All order status updates done via direct DB update (RLS allows admin writes)
4. Branch assignment via `assign-order-store`
5. Rider assignment: `UPDATE orders SET rider_id = ? WHERE id = ?`, then `notify-rider-assignment`

### Branch Manager Flow

1. Logs in at `/store/login` — checks `user_roles.role = 'branch_manager'`
2. Sees only their branch's orders (`orders.branch_id = their_branch_id`)
3. Updates order status through processing → confirmed → out_for_delivery → delivered
4. Manages branch inventory and restock requests
5. Views rider locations on live map

### Rider Flow

1. Logs in at `/rider/login` — checks `user_roles.role = 'rider'`
2. Sees assigned deliveries (`orders.rider_id = their_rider_id`)
3. Updates location via upsert to `rider_locations` every ~5 seconds
4. Marks orders delivered

---

## 14. Mobile App Integration Guide

### Recommended SDK

```bash
npm install @supabase/supabase-js
# React Native: also install
npm install @react-native-async-storage/async-storage
```

### Client Initialization

```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const supabase = createClient(
  'https://quvxhyfmzlealancapaq.supabase.co',
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

### Deep Link for Google OAuth (React Native)

```typescript
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'handasjuice://auth-callback',
  },
});
```

Configure the `handasjuice://` scheme in your app manifest and handle the callback URL by extracting the session from the URL fragment.

### Calling Edge Functions

```typescript
// With user auth (most functions)
const { data, error } = await supabase.functions.invoke('calculate-delivery-fee', {
  body: { delivery_address: '...', delivery_lat: -1.28, delivery_lng: 36.82 },
});

// Payment initialization
const { data } = await supabase.functions.invoke('initialize-payment', {
  body: {
    email: user.email,
    amount: totalAmount,
    metadata: { customer_name, phone, delivery_address, items },
  },
});
// Open data.authorization_url in an in-app browser
```

### In-App Browser for Payment

Use `expo-web-browser` or `react-native-inappbrowser-reborn` to open the Paystack authorization URL. On redirect back to `handasjuice://order-confirmation?reference=...`, close the browser and call `verify-payment`.

### Rider Location Updates (Background)

Use `expo-location` with background location task:

```typescript
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const LOCATION_TASK = 'RIDER_LOCATION';

TaskManager.defineTask(LOCATION_TASK, async ({ data }) => {
  const { locations } = data as any;
  const loc = locations[0];
  await supabase.from('rider_locations').upsert({
    rider_id: RIDER_ID,
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
    heading: loc.coords.heading,
    speed: loc.coords.speed,
    accuracy: loc.coords.accuracy,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'rider_id' });
});

await Location.startLocationUpdatesAsync(LOCATION_TASK, {
  accuracy: Location.Accuracy.High,
  timeInterval: 5000,
  distanceInterval: 10,
});
```

### Push Notifications

The current web app uses Supabase Realtime for in-app notifications. For the mobile app, integrate Expo Push Notifications (or FCM/APNs directly):

1. On rider login, register the device push token and store it in `profiles` or a new `device_tokens` table
2. Call `notify-rider-assignment` (already exists) — extend it to also send a push notification using the stored device token
3. For order status changes, add a database trigger or extend Edge Functions to fire push notifications

### Important Notes for Mobile

- **Never hardcode** `SUPABASE_SERVICE_ROLE_KEY` in the mobile app — it has full DB bypass access
- **Always use RLS** — the anon key + RLS is the security model
- **Guest orders** — supported; `user_id` can be null in the orders table
- **Product images** — all served from the same Supabase storage bucket as the web app
- **Blog content** — rendered as HTML; use a WebView or HTML renderer (e.g., `react-native-render-html`)
- **Coupon validation** — done client-side by querying `coupons` table; the final total is verified server-side during payment
- **International orders** — set `is_international = true` and `country` on the order row; shipping fee is calculated separately

---

*Last updated: May 2026 — reflects all migrations through `20260511`.*
