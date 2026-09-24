using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SplitSync.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddExpenseReceipts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasReceipt",
                table: "Expenses",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "ExpenseReceipts",
                columns: table => new
                {
                    ExpenseId = table.Column<Guid>(type: "uuid", nullable: false),
                    Data = table.Column<byte[]>(type: "bytea", nullable: false),
                    ContentType = table.Column<string>(type: "text", nullable: false),
                    UploadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExpenseReceipts", x => x.ExpenseId);
                    table.ForeignKey(
                        name: "FK_ExpenseReceipts_Expenses_ExpenseId",
                        column: x => x.ExpenseId,
                        principalTable: "Expenses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ExpenseReceipts");

            migrationBuilder.DropColumn(
                name: "HasReceipt",
                table: "Expenses");
        }
    }
}
