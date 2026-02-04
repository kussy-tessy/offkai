import z from "zod";

export const ISODateTimeStringSchema = z.string().datetime();
export type ISODateTimeString = z.infer<typeof ISODateTimeStringSchema>;
