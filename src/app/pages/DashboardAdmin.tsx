import { useEffect, useState } from 'react';
import { Users, Shield, FileText, Activity, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { StatusBadge } from '../components/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { fetchDashboardStats } from '../services/notifications-service';
import { fetchUsers } from '../services/users-service';
import { BACKEND_ROLE_LABELS, formatDateTime } from '../utils/format';
import type { UserDto } from '../types/api';

export default function DashboardAdmin() {
  const navigate = useNavigate();
  const [counters, setCounters] = useState<Record<string, number>>({});
  const [recentUsers, setRecentUsers] = useState<UserDto[]>([]);

  useEffect(() => {
    Promise.all([fetchDashboardStats(), fetchUsers()])
      .then(([stats, users]) => {
        setCounters(stats.counters);
        setRecentUsers(
          [...users]
            .sort((a, b) => (b.lastLoginAt ?? '').localeCompare(a.lastLoginAt ?? ''))
            .slice(0, 6));
      })
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'No se pudo cargar el dashboard.'));
  }, []);

  const stats = [
    { title: 'Total Usuarios', value: counters.totalUsers ?? 0, icon: <Users className="w-6 h-6 text-[#C9982E]" /> },
    { title: 'Usuarios Activos', value: counters.activeUsers ?? 0, icon: <Activity className="w-6 h-6 text-green-600" /> },
    { title: 'Docentes', value: counters.teachers ?? 0, icon: <Shield className="w-6 h-6 text-[#00345E]" /> },
    { title: 'Procesos', value: counters.totalProcesses ?? 0, icon: <FileText className="w-6 h-6 text-blue-600" /> },
    { title: 'Postulaciones', value: counters.totalApplications ?? 0, icon: <ClipboardList className="w-6 h-6 text-purple-600" /> }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Panel de Administración</h1>
          <p className="text-muted-foreground">Vista general del sistema y gestión de usuarios</p>
        </div>
        <Button onClick={() => navigate('/usuarios')} className="bg-[#00345E] hover:bg-[#002A4B]">
          <Users className="w-4 h-4 mr-2" />
          Gestionar Usuarios
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-semibold mt-2">{stat.value}</p>
                </div>
                <div className="bg-secondary p-3 rounded-lg">{stat.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Últimos accesos</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/usuarios')}>
              Ver todos
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último acceso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.fullName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{BACKEND_ROLE_LABELS[user.role]}</Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={user.isActive ? 'activo' : 'inactivo'} />
                  </TableCell>
                  <TableCell>{formatDateTime(user.lastLoginAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
