import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, MoreVertical, ShieldCheck, UserX, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { StatusBadge } from '../components/StatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select';
import { Label } from '../components/ui/label';
import { fetchUsers, changeUserRole, changeUserStatus } from '../services/users-service';
import { BACKEND_ROLE_LABELS, formatDateTime } from '../utils/format';
import type { BackendRole, UserDto } from '../types/api';

const ROLE_OPTIONS: BackendRole[] = ['admin', 'cp', 'th', 'ca', 'teacher'];

export default function GestionUsuarios() {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [roleDialogUser, setRoleDialogUser] = useState<UserDto | null>(null);
  const [pendingRole, setPendingRole] = useState<BackendRole>('teacher');
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setUsers(await fetchUsers());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cargar la lista de usuarios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          user.fullName.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
        const matchesRole = selectedRole === 'all' || user.role === selectedRole;
        return matchesSearch && matchesRole;
      }),
    [users, searchQuery, selectedRole]
  );

  const openRoleDialog = (user: UserDto) => {
    setRoleDialogUser(user);
    setPendingRole(user.role);
  };

  const handleChangeRole = async () => {
    if (!roleDialogUser) return;
    try {
      setSaving(true);
      const updated = await changeUserRole(roleDialogUser.id, pendingRole);
      setUsers((current) => current.map((u) => (u.id === updated.id ? updated : u)));
      toast.success(`Rol de ${updated.fullName} actualizado a ${BACKEND_ROLE_LABELS[updated.role]}.`);
      setRoleDialogUser(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el rol.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user: UserDto) => {
    try {
      const updated = await changeUserStatus(user.id, !user.isActive);
      setUsers((current) => current.map((u) => (u.id === updated.id ? updated : u)));
      toast.success(updated.isActive
        ? `${updated.fullName} fue activado.`
        : `${updated.fullName} fue desactivado.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cambiar el estado del usuario.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Gestión de Usuarios</h1>
        <p className="text-muted-foreground">
          Los usuarios se crean automáticamente en su primer inicio de sesión con el rol Docente.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle>Usuarios registrados ({filteredUsers.length})</CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o correo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-9"
                />
              </div>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Filtrar por rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role} value={role}>
                      {BACKEND_ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">Cargando usuarios...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Posición actual</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Último acceso</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.fullName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{BACKEND_ROLE_LABELS[user.role]}</Badge>
                    </TableCell>
                    <TableCell>{user.currentPosition ?? '—'}</TableCell>
                    <TableCell>
                      <StatusBadge status={user.isActive ? 'activo' : 'inactivo'} />
                    </TableCell>
                    <TableCell>{formatDateTime(user.lastLoginAt)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openRoleDialog(user)}>
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Cambiar rol
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => void handleToggleStatus(user)}
                            className={user.isActive ? 'text-red-600' : 'text-green-600'}
                          >
                            {user.isActive ? (
                              <>
                                <UserX className="mr-2 h-4 w-4" />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Activar
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No se encontraron usuarios.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={roleDialogUser !== null} onOpenChange={(open) => !open && setRoleDialogUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar rol</DialogTitle>
            <DialogDescription>
              {roleDialogUser
                ? `Seleccione el nuevo rol para ${roleDialogUser.fullName} (${roleDialogUser.email}).`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={pendingRole} onValueChange={(value) => setPendingRole(value as BackendRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((role) => (
                  <SelectItem key={role} value={role}>
                    {BACKEND_ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogUser(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={() => void handleChangeRole()} disabled={saving} className="bg-[#00345E]">
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
