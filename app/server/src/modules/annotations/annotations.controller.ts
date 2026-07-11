import { Body, Controller, Get, Param, Put } from "@tsuki-hono/common";
import { annotationsService } from "../../../../packages/core/src/modules/annotations/annotations.service.js";
import { ClientError } from "../../../../packages/core/src/errors.js";

@Controller("annotations")
export class AnnotationsController {
  @Get("/:symbol")
  async getAnnotations(@Param("symbol") symbol: string) {
    const data = await annotationsService.list({ symbol });
    return { ok: true, data };
  }

  @Put("/:symbol")
  async putAnnotations(@Param("symbol") symbol: string, @Body() body: unknown) {
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new ClientError("request body must be JSON", 'e.g. {"annotations": []}');
    }
    const data = await annotationsService.replace({ symbol, annotations: (body as Record<string, unknown>).annotations });
    return { ok: true, data };
  }
}
