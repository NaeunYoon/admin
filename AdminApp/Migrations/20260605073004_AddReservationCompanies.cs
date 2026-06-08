using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AdminApp.Migrations
{
    /// <inheritdoc />
    public partial class AddReservationCompanies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Companies",
                table: "RoomReservations",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Companies",
                table: "RoomReservations");
        }
    }
}
