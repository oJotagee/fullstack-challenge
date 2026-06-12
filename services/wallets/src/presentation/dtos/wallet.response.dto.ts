import { ApiProperty } from '@nestjs/swagger';

export class WalletResponseDto {
  @ApiProperty({ example: 'wallet-456', description: 'The unique identifier of the wallet' })
  id!: string;

  @ApiProperty({ example: 'player-123', description: 'The unique identifier of the player' })
  playerId!: string;

  @ApiProperty({ example: 1000, description: 'The balance of the wallet in cents' })
  balanceCents!: string;
}
