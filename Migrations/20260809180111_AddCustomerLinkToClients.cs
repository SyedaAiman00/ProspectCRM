using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProspectCRM.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerLinkToClients : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Add the new columns as nullable, so existing rows don't break.
            migrationBuilder.AddColumn<int>(
                name: "customer_id",
                table: "clients",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "insured_person_name",
                table: "clients",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            // 2. Backfill: for every existing policy that has no CustomerId yet,
            // create a matching Customer record (using the policy's existing
            // insured_name and agent_id) and link the policy to it. This keeps
            // every pre-existing policy owned by a real Customer instead of
            // being orphaned with a null CustomerId.
            migrationBuilder.Sql(@"
                INSERT INTO customers (agent_id, name, customer_type, created_at)
                SELECT DISTINCT c.agent_id, c.insured_name, 'Individual', NOW()
                FROM clients c
                WHERE c.customer_id IS NULL;
            ");

            migrationBuilder.Sql(@"
                UPDATE clients c
                JOIN customers cu
                  ON cu.agent_id = c.agent_id
                 AND cu.name = c.insured_name
                SET c.customer_id = cu.id,
                    c.insured_person_name = c.insured_name
                WHERE c.customer_id IS NULL;
            ");

            // 3. Add a foreign key so the database itself enforces the link
            // (a policy can't reference a Customer that doesn't exist).
            migrationBuilder.CreateIndex(
                name: "IX_clients_customer_id",
                table: "clients",
                column: "customer_id");

            migrationBuilder.AddForeignKey(
                name: "FK_clients_customers_customer_id",
                table: "clients",
                column: "customer_id",
                principalTable: "customers",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_clients_customers_customer_id",
                table: "clients");

            migrationBuilder.DropIndex(
                name: "IX_clients_customer_id",
                table: "clients");

            migrationBuilder.DropColumn(
                name: "customer_id",
                table: "clients");

            migrationBuilder.DropColumn(
                name: "insured_person_name",
                table: "clients");
        }
    }
}