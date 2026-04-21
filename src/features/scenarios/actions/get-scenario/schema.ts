import { z } from "zod";

import { uuid } from "@/lib/schema-helpers";

export const getScenarioSchema = z.object({ scenarioId: uuid });
