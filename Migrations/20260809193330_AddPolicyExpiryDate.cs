using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProspectCRM.Migrations
{
    /// <inheritdoc />
    public partial class AddPolicyExpiryDate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "policy_expiry_date",
                table: "clients",
                type: "datetime(6)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "policy_expiry_date",
                table: "clients");
        }
    }
}
