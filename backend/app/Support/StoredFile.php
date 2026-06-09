<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class StoredFile
{
    public static function resolve(string $filePath): ?array
    {
        $path = ltrim($filePath, '/');
        $publicRelative = preg_replace('#^public/#', '', $path);

        foreach ([
            ['disk' => 'public', 'path' => $publicRelative],
            ['disk' => 'public', 'path' => $path],
            ['disk' => 'local', 'path' => $path],
            ['disk' => 'local', 'path' => $publicRelative],
        ] as $candidate) {
            if ($candidate['path'] === '') {
                continue;
            }

            if (Storage::disk($candidate['disk'])->exists($candidate['path'])) {
                return [
                    'disk' => $candidate['disk'],
                    'path' => $candidate['path'],
                ];
            }
        }

        foreach ([
            storage_path('app/public/' . $publicRelative),
            storage_path('app/private/' . $path),
            storage_path('app/private/' . $publicRelative),
            storage_path('app/' . $path),
        ] as $absolutePath) {
            if (is_file($absolutePath)) {
                return ['absolute' => $absolutePath];
            }
        }

        return null;
    }

    public static function response(string $filePath): BinaryFileResponse
    {
        $resolved = self::resolve($filePath);
        if (!$resolved) {
            abort(404);
        }

        if (isset($resolved['absolute'])) {
            return response()->file($resolved['absolute']);
        }

        return response()->file(Storage::disk($resolved['disk'])->path($resolved['path']));
    }

    public static function publicPath(string $filePath): string
    {
        $normalizedPath = preg_replace('#^public/#', '', ltrim($filePath, '/'));

        return '/storage/' . ltrim($normalizedPath, '/');
    }
}
