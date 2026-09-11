using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SplitSync.Api.Migrations
{
    /// <inheritdoc />
    public partial class AllowAccountDeletion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Expenses_AspNetUsers_PaidByUserId",
                table: "Expenses");

            migrationBuilder.DropForeignKey(
                name: "FK_ExpenseShares_AspNetUsers_UserId",
                table: "ExpenseShares");

            migrationBuilder.AddForeignKey(
                name: "FK_Expenses_AspNetUsers_PaidByUserId",
                table: "Expenses",
                column: "PaidByUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ExpenseShares_AspNetUsers_UserId",
                table: "ExpenseShares",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Expenses_AspNetUsers_PaidByUserId",
                table: "Expenses");

            migrationBuilder.DropForeignKey(
                name: "FK_ExpenseShares_AspNetUsers_UserId",
                table: "ExpenseShares");

            migrationBuilder.AddForeignKey(
                name: "FK_Expenses_AspNetUsers_PaidByUserId",
                table: "Expenses",
                column: "PaidByUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ExpenseShares_AspNetUsers_UserId",
                table: "ExpenseShares",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
