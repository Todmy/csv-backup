import { RowDataPacket } from './db-scrapper';

export default [
  { name: 'users', createdField: 'created' },
  { name: 'follows', createdField: 'created' },
  { name: 'spaces', createdField: 'created_at' },
  { name: 'proposals', createdField: 'created' },
  {
    name: 'votes',
    createdField: 'created',
    skip: (row: RowDataPacket) => row.space === 'linea-build.eth'
  }
];
