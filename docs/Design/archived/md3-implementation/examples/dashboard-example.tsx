'use client'

import * as React from 'react'
import { MD3Button } from '@/components/md3/button'
import { MD3FAB } from '@/components/md3/fab'
import {
  MD3Card,
  MD3CardHeader,
  MD3CardTitle,
  MD3CardDescription,
  MD3CardContent,
  MD3CardFooter,
} from '@/components/md3/card'
import { MD3TextField } from '@/components/md3/text-field'
import { MD3Chip } from '@/components/md3/chip'
import { MD3Checkbox } from '@/components/md3/checkbox'
import { MD3Switch } from '@/components/md3/switch'
import {
  MD3Dialog,
  MD3DialogContent,
  MD3DialogDescription,
  MD3DialogFooter,
  MD3DialogHeader,
  MD3DialogTitle,
  MD3DialogTrigger,
  MD3DialogIcon,
} from '@/components/md3/dialog'
import { MD3Snackbar, useMD3Snackbar } from '@/components/md3/snackbar'
import { MD3TopAppBar } from '@/components/md3/top-app-bar'
import {
  MD3NavigationBar,
  MD3NavigationBarItem,
} from '@/components/md3/navigation-bar'
import { MaterialIcon } from '@/components/ui/material-icon'
import { useMD3Theme } from '@/components/providers/md3-theme-provider'

/**
 * Complete Example Dashboard Page
 * 
 * This example demonstrates:
 * - Top App Bar with navigation and actions
 * - Cards for content display
 * - FAB for primary action
 * - Forms with MD3 text fields
 * - Dialogs for confirmations
 * - Snackbars for feedback
 * - Navigation bar for mobile
 * - Theme switching
 */
export default function MD3ExampleDashboard() {
  const { theme, setTheme, actualTheme } = useMD3Theme()
  const { snackbar, showSnackbar, hideSnackbar } = useMD3Snackbar()
  
  const [tasks, setTasks] = React.useState([
    { id: 1, title: 'Design new feature', completed: false, priority: 'high' },
    { id: 2, title: 'Code review', completed: true, priority: 'medium' },
    { id: 3, title: 'Update documentation', completed: false, priority: 'low' },
  ])
  
  const [selectedTab, setSelectedTab] = React.useState('tasks')
  const [notifications, setNotifications] = React.useState(true)
  const [newTaskTitle, setNewTaskTitle] = React.useState('')
  const [filterPriority, setFilterPriority] = React.useState<string[]>([])

  const handleToggleTask = (taskId: number) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ))
    showSnackbar('Task updated')
  }

  const handleDeleteTask = (taskId: number) => {
    setTasks(tasks.filter(task => task.id !== taskId))
    showSnackbar('Task deleted', {
      label: 'Undo',
      onClick: () => {
        // In real app, restore the task
        showSnackbar('Task restored')
      },
    })
  }

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return
    
    const newTask = {
      id: Date.now(),
      title: newTaskTitle,
      completed: false,
      priority: 'medium' as const,
    }
    
    setTasks([...tasks, newTask])
    setNewTaskTitle('')
    showSnackbar('Task added successfully')
  }

  const handleTogglePriority = (priority: string) => {
    setFilterPriority(prev =>
      prev.includes(priority)
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    )
  }

  const filteredTasks = filterPriority.length > 0
    ? tasks.filter(task => filterPriority.includes(task.priority))
    : tasks

  const completedCount = tasks.filter(t => t.completed).length
  const pendingCount = tasks.length - completedCount

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top App Bar */}
      <MD3TopAppBar
        variant="small"
        title="Task Manager"
        navigationIcon={
          <MD3Button variant="text" size="icon">
            <MaterialIcon icon="menu" />
          </MD3Button>
        }
        actions={[
          <MD3Button
            key="theme"
            variant="text"
            size="icon"
            onClick={() => setTheme(actualTheme === 'dark' ? 'light' : 'dark')}
          >
            <MaterialIcon 
              icon={actualTheme === 'dark' ? 'light_mode' : 'dark_mode'} 
            />
          </MD3Button>,
          <MD3Button key="search" variant="text" size="icon">
            <MaterialIcon icon="search" />
          </MD3Button>,
          <MD3Button key="more" variant="text" size="icon">
            <MaterialIcon icon="more_vert" />
          </MD3Button>,
        ]}
      />

      {/* Main Content */}
      <main className="flex-1 p-4 pb-24 md:pb-4 space-y-4 max-w-7xl mx-auto w-full">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MD3Card variant="filled">
            <MD3CardHeader>
              <MD3CardTitle>Total Tasks</MD3CardTitle>
              <MD3CardDescription>All your tasks</MD3CardDescription>
            </MD3CardHeader>
            <MD3CardContent>
              <p className="md3-display-medium">{tasks.length}</p>
            </MD3CardContent>
          </MD3Card>

          <MD3Card variant="filled">
            <MD3CardHeader>
              <MD3CardTitle>Pending</MD3CardTitle>
              <MD3CardDescription>Tasks to complete</MD3CardDescription>
            </MD3CardHeader>
            <MD3CardContent>
              <p className="md3-display-medium text-error">{pendingCount}</p>
            </MD3CardContent>
          </MD3Card>

          <MD3Card variant="filled">
            <MD3CardHeader>
              <MD3CardTitle>Completed</MD3CardTitle>
              <MD3CardDescription>Tasks finished</MD3CardDescription>
            </MD3CardHeader>
            <MD3CardContent>
              <p className="md3-display-medium text-tertiary">{completedCount}</p>
            </MD3CardContent>
          </MD3Card>
        </div>

        {/* Filters */}
        <MD3Card variant="outlined">
          <MD3CardContent className="pt-6">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="md3-label-large mr-2">Filter by priority:</span>
              <MD3Chip
                variant="filter"
                selected={filterPriority.includes('high')}
                onClick={() => handleTogglePriority('high')}
              >
                High
              </MD3Chip>
              <MD3Chip
                variant="filter"
                selected={filterPriority.includes('medium')}
                onClick={() => handleTogglePriority('medium')}
              >
                Medium
              </MD3Chip>
              <MD3Chip
                variant="filter"
                selected={filterPriority.includes('low')}
                onClick={() => handleTogglePriority('low')}
              >
                Low
              </MD3Chip>
              {filterPriority.length > 0 && (
                <MD3Button
                  variant="text"
                  size="sm"
                  onClick={() => setFilterPriority([])}
                >
                  Clear
                </MD3Button>
              )}
            </div>
          </MD3CardContent>
        </MD3Card>

        {/* Tasks List */}
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <MD3Card key={task.id} variant="elevated" interactive>
              <MD3CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <MD3Checkbox
                    checked={task.completed}
                    onCheckedChange={() => handleToggleTask(task.id)}
                  />
                  <div className="flex-1">
                    <p
                      className={cn(
                        'md3-body-large',
                        task.completed && 'line-through text-on-surface-variant'
                      )}
                    >
                      {task.title}
                    </p>
                    <MD3Chip variant="assist" size="sm" className="mt-1">
                      {task.priority}
                    </MD3Chip>
                  </div>
                  
                  <MD3Dialog>
                    <MD3DialogTrigger asChild>
                      <MD3Button variant="text" size="icon">
                        <MaterialIcon icon="delete" />
                      </MD3Button>
                    </MD3DialogTrigger>
                    <MD3DialogContent>
                      <MD3DialogIcon icon="delete" />
                      <MD3DialogHeader>
                        <MD3DialogTitle>Delete task?</MD3DialogTitle>
                        <MD3DialogDescription>
                          This action cannot be undone. This will permanently delete the task.
                        </MD3DialogDescription>
                      </MD3DialogHeader>
                      <MD3DialogFooter>
                        <MD3DialogClose asChild>
                          <MD3Button variant="text">Cancel</MD3Button>
                        </MD3DialogClose>
                        <MD3DialogClose asChild>
                          <MD3Button
                            variant="text"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            Delete
                          </MD3Button>
                        </MD3DialogClose>
                      </MD3DialogFooter>
                    </MD3DialogContent>
                  </MD3Dialog>
                </div>
              </MD3CardContent>
            </MD3Card>
          ))}
        </div>

        {/* Settings Card */}
        <MD3Card variant="outlined">
          <MD3CardHeader>
            <MD3CardTitle>Settings</MD3CardTitle>
            <MD3CardDescription>Manage your preferences</MD3CardDescription>
          </MD3CardHeader>
          <MD3CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="md3-body-large">Enable notifications</p>
                <p className="md3-body-small text-on-surface-variant">
                  Get notified about task updates
                </p>
              </div>
              <MD3Switch
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
          </MD3CardContent>
        </MD3Card>
      </main>

      {/* FAB - Add Task */}
      <MD3Dialog>
        <MD3DialogTrigger asChild>
          <div className="fixed bottom-20 right-4 md:bottom-4 z-40">
            <MD3FAB
              variant="primary"
              icon={<MaterialIcon icon="add" />}
            />
          </div>
        </MD3DialogTrigger>
        <MD3DialogContent>
          <MD3DialogHeader>
            <MD3DialogTitle>Add New Task</MD3DialogTitle>
            <MD3DialogDescription>
              Create a new task to stay organized
            </MD3DialogDescription>
          </MD3DialogHeader>
          
          <div className="space-y-4 py-4">
            <MD3TextField
              variant="outlined"
              label="Task title"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Enter task title"
            />
          </div>

          <MD3DialogFooter>
            <MD3DialogClose asChild>
              <MD3Button variant="text">Cancel</MD3Button>
            </MD3DialogClose>
            <MD3DialogClose asChild>
              <MD3Button
                variant="filled"
                onClick={handleAddTask}
                disabled={!newTaskTitle.trim()}
              >
                Add Task
              </MD3Button>
            </MD3DialogClose>
          </MD3DialogFooter>
        </MD3DialogContent>
      </MD3Dialog>

      {/* Bottom Navigation - Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0">
        <MD3NavigationBar>
          <MD3NavigationBarItem
            icon={<MaterialIcon icon="task" />}
            activeIcon={<MaterialIcon icon="task" filled />}
            label="Tasks"
            active={selectedTab === 'tasks'}
            onClick={() => setSelectedTab('tasks')}
          />
          <MD3NavigationBarItem
            icon={<MaterialIcon icon="analytics" />}
            activeIcon={<MaterialIcon icon="analytics" filled />}
            label="Analytics"
            active={selectedTab === 'analytics'}
            onClick={() => setSelectedTab('analytics')}
          />
          <MD3NavigationBarItem
            icon={<MaterialIcon icon="notifications" />}
            activeIcon={<MaterialIcon icon="notifications" filled />}
            label="Alerts"
            active={selectedTab === 'alerts'}
            onClick={() => setSelectedTab('alerts')}
            badge={3}
          />
          <MD3NavigationBarItem
            icon={<MaterialIcon icon="settings" />}
            activeIcon={<MaterialIcon icon="settings" filled />}
            label="Settings"
            active={selectedTab === 'settings'}
            onClick={() => setSelectedTab('settings')}
          />
        </MD3NavigationBar>
      </div>

      {/* Snackbar */}
      <MD3Snackbar
        open={snackbar.open}
        onOpenChange={hideSnackbar}
        message={snackbar.message}
        action={snackbar.action}
      />
    </div>
  )
}
