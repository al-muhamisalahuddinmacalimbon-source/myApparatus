import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import pool from "@/lib/db";
import { addStudentNotification } from "@/lib/services/studentNotificationWriter";
import type { MachineStatus } from "@/types/machine";

const machineStatuses: MachineStatus[] = [
  "available",
  "in_use",
  "maintenance",
  "archived",
];

type RouteContext = {
  params: Promise<{ id: string }>;
};

type MachineRecord = {
  name: string;
  model: string | null;
  specifications: string | null;
  status: MachineStatus;
  notes: string | null;
};

type EditableMachineField = keyof MachineRecord;
type MachineCreateInput = {
  name: string;
  model?: string | null;
  specifications?: string | null;
  status?: MachineStatus;
  notes?: string | null;
};
type MachineUpdateInput = Partial<MachineRecord>;

const editableMachineFields: EditableMachineField[] = [
  "name",
  "model",
  "specifications",
  "status",
  "notes",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMachineStatus(value: unknown): value is MachineStatus {
  return (
    typeof value === "string" &&
    machineStatuses.some((status) => status === value)
  );
}

function isEditableMachineField(value: string): value is EditableMachineField {
  return editableMachineFields.some((field) => field === value);
}

function isOptionalText(value: unknown, maxLength: number) {
  return (
    value === null ||
    (typeof value === "string" && value.trim().length <= maxLength)
  );
}

function isMachineCreateInput(value: unknown): value is MachineCreateInput {
  if (!isRecord(value) || Object.keys(value).some((field) => !isEditableMachineField(field))) {
    return false;
  }
  return (
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    value.name.trim().length <= 100 &&
    (value.model === undefined || isOptionalText(value.model, 120)) &&
    (value.specifications === undefined ||
      isOptionalText(value.specifications, 5000)) &&
    (value.notes === undefined || isOptionalText(value.notes, 5000)) &&
    (value.status === undefined || isMachineStatus(value.status))
  );
}

function isMachineUpdateInput(value: unknown): value is MachineUpdateInput {
  if (
    !isRecord(value) ||
    Object.keys(value).length === 0 ||
    Object.keys(value).some((field) => !isEditableMachineField(field))
  ) {
    return false;
  }
  return (
    (!("name" in value) ||
      (typeof value.name === "string" &&
        value.name.trim().length > 0 &&
        value.name.trim().length <= 100)) &&
    (!("model" in value) || isOptionalText(value.model, 120)) &&
    (!("specifications" in value) ||
      isOptionalText(value.specifications, 5000)) &&
    (!("notes" in value) || isOptionalText(value.notes, 5000)) &&
    (!("status" in value) || isMachineStatus(value.status))
  );
}

function normalizeText(value: string | null | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function hasUniqueNameConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function machineNameConflictResponse() {
  return NextResponse.json(
    { error: "A machine with that name already exists." },
    { status: 409 },
  );
}

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT id, name, model, specifications, status, notes, created_at, updated_at
       FROM machines
       ORDER BY name, id`,
    );
    return NextResponse.json(result.rows, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Unable to load catalog machines:", error);
    return NextResponse.json(
      { error: "Unable to load machines from the database." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid machine details." }, { status: 400 });
  }

  if (!isMachineCreateInput(body)) {
    return NextResponse.json(
      { error: "Enter a valid machine name, details, and status." },
      { status: 400 },
    );
  }

  const machine: MachineRecord = {
    name: body.name.trim(),
    model: normalizeText(body.model),
    specifications: normalizeText(body.specifications),
    status: body.status ?? "available",
    notes: normalizeText(body.notes),
  };

  try {
    const result = await pool.query(
      `INSERT INTO machines (name, model, specifications, status, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, model, specifications, status, notes, created_at, updated_at`,
      [
        machine.name,
        machine.model,
        machine.specifications,
        machine.status,
        machine.notes,
      ],
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    if (hasUniqueNameConflict(error)) return machineNameConflictResponse();
    console.error("Unable to create catalog machine:", error);
    return NextResponse.json(
      { error: "Unable to add the machine to the catalog." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) {
    return NextResponse.json({ error: "Invalid machine ID." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid machine details." }, { status: 400 });
  }

  if (!isMachineUpdateInput(body)) {
    return NextResponse.json(
      { error: "Enter valid machine fields to update." },
      { status: 400 },
    );
  }

  const values: Array<string | null | MachineStatus | number> = [];
  const assignments: string[] = [];
  const addUpdate = (field: EditableMachineField, value: string | null | MachineStatus) => {
    values.push(value);
    assignments.push(`${field} = $${values.length}`);
  };

  if (body.name !== undefined) addUpdate("name", body.name.trim());
  if (body.model !== undefined) addUpdate("model", normalizeText(body.model));
  if (body.specifications !== undefined) {
    addUpdate("specifications", normalizeText(body.specifications));
  }
  if (body.status !== undefined) addUpdate("status", body.status);
  if (body.notes !== undefined) addUpdate("notes", normalizeText(body.notes));
  assignments.push("updated_at = NOW()");
  values.push(Number(id));

  let client: PoolClient | undefined;
  let transactionStarted = false;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    const currentResult = await client.query<{
      name: string;
      status: MachineStatus;
    }>(
      "SELECT name, status FROM machines WHERE id = $1 FOR UPDATE",
      [Number(id)],
    );
    const currentMachine = currentResult.rows[0];
    if (!currentMachine) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json({ error: "Machine was not found." }, { status: 404 });
    }

    const result = await client.query(
      `UPDATE machines
       SET ${assignments.join(", ")}
       WHERE id = $${values.length}
       RETURNING id, name, model, specifications, status, notes, created_at, updated_at`,
      values,
    );

    if (body.status === "archived" && currentMachine.status !== "archived") {
      const cancelledReservations = await client.query<{
        student_id: string;
        start_time: Date;
      }>(
        `UPDATE reservations
         SET status = 'Cancelled'
         WHERE machine_id = $1
           AND status = 'Booked'
           AND start_time > CURRENT_TIMESTAMP
         RETURNING student_id, start_time`,
        [Number(id)],
      );
      for (const reservation of cancelledReservations.rows) {
        await addStudentNotification(client, {
          studentId: reservation.student_id,
          eventType: "Reservation Update",
          message: `Your reservation for ${currentMachine.name} at ${reservation.start_time.toISOString()} was cancelled because a technician archived the machine.`,
          href: "/reserve",
        });
      }
    }

    await client.query("COMMIT");
    transactionStarted = false;
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    if (transactionStarted && client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Machine Update Rollback Error:", rollbackError);
      }
    }
    if (hasUniqueNameConflict(error)) return machineNameConflictResponse();
    console.error("Unable to update catalog machine:", error);
    return NextResponse.json(
      { error: "Unable to update the machine in the catalog." },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}
