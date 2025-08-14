-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
